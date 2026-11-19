/* Bounded libbluray reader. stdout is one JSON object; never print input URLs.
 * Usage: disc-reader INPUT OUTPUT TARGET [--playlist ID] [--duration SECONDS]
 * Raw M2TS is converted to 188-byte TS without changing PES timestamps.
 */
#include <libbluray/bluray.h>
#include <libbluray/log_control.h>
#include <curl/curl.h>
#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <unistd.h>

#define MAX_BYTES (508ULL * 1024 * 1024)
#define MAX_HTTP_READ (4U * 1024 * 1024)
#define TICKS 90000.0

typedef struct {
    CURL *curl;
    const char *url;
    unsigned char *buf;
    size_t size, used;
    uint64_t start, end;
    int range_ok, failed;
    uint64_t total_bytes, cache_lba;
    size_t cache_blocks;
    unsigned char cache[4 * 1024 * 1024];
    struct { unsigned char *data; uint64_t lba, age; size_t blocks; } saved[16];
    uint64_t clock;
} Remote;

static int fail(const char *message) {
    fprintf(stderr, "disc-reader: %s\n", message);
    return 1;
}

static int number(const char *s, double *value) {
    char *end;
    errno = 0;
    *value = strtod(s, &end);
    return *s && end != s && !*end && !errno && isfinite(*value) &&
           *value >= 0 && *value <= 86400000;
}

static size_t body(char *data, size_t size, size_t count, void *opaque) {
    Remote *r = opaque;
    if (size && count > SIZE_MAX / size) return 0;
    size_t n = size * count;
    if (!r->range_ok || n > r->size - r->used) return 0;
    memcpy(r->buf + r->used, data, n);
    r->used += n;
    return n;
}

static size_t header(char *data, size_t size, size_t count, void *opaque) {
    Remote *r = opaque;
    size_t n = size * count;
    if (n >= 5 && !strncasecmp(data, "HTTP/", 5)) r->range_ok = 0;
    if (n > 14 && !strncasecmp(data, "Content-Range:", 14)) {
        char line[256];
        if (n >= sizeof(line)) return 0;
        memcpy(line, data, n);
        line[n] = 0;
        uint64_t start, end, total;
        if (sscanf(line + 14, " bytes %" SCNu64 "-%" SCNu64 "/%" SCNu64,
                   &start, &end, &total) == 3 && start == r->start &&
            end == r->end && total > end && (!r->total_bytes || total == r->total_bytes)) {
            r->range_ok = 1;
            r->total_bytes = total;
        }
    }
    return n;
}

static int block_range(void *opaque, void *buf, int lba, int count) {
    Remote *r = opaque;
    if (r->failed || lba < 0 || count <= 0 || count > (int)(MAX_HTTP_READ / 2048)) {
        r->failed = 1;
        return -1;
    }
    r->start = (uint64_t)lba * 2048;
    r->size = (size_t)count * 2048;
    r->end = r->start + r->size - 1;
    r->used = 0;
    r->range_ok = 0;
    r->buf = buf;
    char range[80];
    snprintf(range, sizeof(range), "%" PRIu64 "-%" PRIu64, r->start, r->end);
    curl_easy_setopt(r->curl, CURLOPT_RANGE, range);
    /* Network-mounted media servers drop or stall individual requests; one
     * transient failure used to abort the whole capture. Retry those, but not
     * answers that will not change (no Range support, auth, missing file). */
    for (int attempt = 0; attempt < 5; ++attempt) {
        if (attempt) sleep((unsigned)(attempt * 2));
        r->used = 0;
        r->range_ok = 0;
        CURLcode result = curl_easy_perform(r->curl);
        long status = 0;
        curl_easy_getinfo(r->curl, CURLINFO_RESPONSE_CODE, &status);
        if (result == CURLE_OK && status == 206 && r->range_ok && r->used == r->size) return count;
        if (result == CURLE_OK && (status == 200 || (status >= 400 && status < 500 && status != 408 && status != 429))) break;
    }
    r->failed = 1;
    return -1;
}

/* Cache aligned 4 MiB windows: metadata often rereads individual blocks.
 * Learn total size with one exact block before issuing bounded read-ahead.
 * The proxy owns the aggregate byte/request/deadline budget. */
static int blocks(void *opaque, void *buf, int lba, int count) {
    Remote *r = opaque;
    if (lba < 0 || count <= 0 || lba > INT_MAX - count) {
        r->failed = 1;
        return -1;
    }
    int done = 0;
    while (done < count) {
        uint64_t current = (uint64_t)lba + (unsigned)done;
        if (!r->cache_blocks || current < r->cache_lba || current >= r->cache_lba + r->cache_blocks) {
            int hit = -1;
            for (int i = 0; i < 16; ++i) {
                if (r->saved[i].data && current >= r->saved[i].lba && current < r->saved[i].lba + r->saved[i].blocks) { hit = i; break; }
            }
            if (hit >= 0) {
                memcpy(r->cache, r->saved[hit].data, r->saved[hit].blocks * 2048);
                r->cache_lba = r->saved[hit].lba;
                r->cache_blocks = r->saved[hit].blocks;
                r->saved[hit].age = ++r->clock;
                continue;
            }
            uint64_t base = r->total_bytes ? current / 2048 * 2048 : current;
            uint64_t available = r->total_bytes / 2048;
            if (r->total_bytes && current >= available) { r->failed = 1; return -1; }
            int n = r->total_bytes ? (int)((available - base) < 2048 ? available - base : 2048) : 1;
            r->cache_blocks = 0;
            if (base > INT_MAX || block_range(opaque, r->cache, (int)base, n) != n) return -1;
            r->cache_lba = base;
            r->cache_blocks = (size_t)n;
            int slot = 0;
            for (int i = 0; i < 16; ++i) {
                if (!r->saved[i].data) { slot = i; break; }
                if (r->saved[i].age < r->saved[slot].age) slot = i;
            }
            if (!r->saved[slot].data) r->saved[slot].data = malloc(sizeof(r->cache));
            if (r->saved[slot].data) {
                memcpy(r->saved[slot].data, r->cache, r->cache_blocks * 2048);
                r->saved[slot].lba = base;
                r->saved[slot].blocks = r->cache_blocks;
                r->saved[slot].age = ++r->clock;
            }
        }
        size_t offset = (size_t)(current - r->cache_lba);
        size_t n = r->cache_blocks - offset;
        if (n > (size_t)(count - done)) n = (size_t)(count - done);
        memcpy((unsigned char *)buf + (size_t)done * 2048, r->cache + offset * 2048, n * 2048);
        done += (int)n;
    }
    return done;
}

static int same_streams(const BLURAY_STREAM_INFO *a, const BLURAY_STREAM_INFO *b, unsigned count) {
    for (unsigned i = 0; i < count; ++i) {
        if (a[i].pid != b[i].pid || a[i].coding_type != b[i].coding_type ||
            a[i].subpath_id != b[i].subpath_id || memcmp(a[i].lang, b[i].lang, 4)) return 0;
    }
    return 1;
}

/* Equivalent default-angle playback, including primary video/audio/subtitle mapping.
 * Refuse alternate angles/subpaths instead of treating them as equivalent. */
static int same_title(const BLURAY_TITLE_INFO *a, const BLURAY_TITLE_INFO *b) {
    if (a->angle_count > 1 || b->angle_count > 1 || a->duration != b->duration || a->clip_count != b->clip_count) return 0;
    for (uint32_t i = 0; i < a->clip_count; ++i) {
        const BLURAY_CLIP_INFO *x = &a->clips[i], *y = &b->clips[i];
        if (memcmp(x->clip_id, y->clip_id, 6) || x->in_time != y->in_time || x->out_time != y->out_time ||
            x->start_time != y->start_time || x->video_stream_count != y->video_stream_count ||
            x->audio_stream_count != y->audio_stream_count || x->pg_stream_count != y->pg_stream_count ||
            x->sec_video_stream_count || y->sec_video_stream_count || x->sec_audio_stream_count || y->sec_audio_stream_count ||
            x->dv_stream_count || y->dv_stream_count ||
            !same_streams(x->video_streams, y->video_streams, x->video_stream_count) ||
            !same_streams(x->audio_streams, y->audio_streams, x->audio_stream_count) ||
            !same_streams(x->pg_streams, y->pg_streams, x->pg_stream_count)) return 0;
    }
    return 1;
}

static int loopback_url(const char *input) {
    CURLU *url = curl_url();
    char *host = NULL, *scheme = NULL, *user = NULL, *password = NULL, *fragment = NULL;
    int valid = 0;
    if (url && curl_url_set(url, CURLUPART_URL, input, 0) == CURLUE_OK &&
        curl_url_get(url, CURLUPART_HOST, &host, 0) == CURLUE_OK &&
        curl_url_get(url, CURLUPART_SCHEME, &scheme, 0) == CURLUE_OK) {
        valid = !strcmp(scheme, "http") &&
                (!strcmp(host, "127.0.0.1") || !strcmp(host, "[::1]"));
        if (curl_url_get(url, CURLUPART_USER, &user, 0) == CURLUE_OK ||
            curl_url_get(url, CURLUPART_PASSWORD, &password, 0) == CURLUE_OK ||
            curl_url_get(url, CURLUPART_FRAGMENT, &fragment, 0) == CURLUE_OK) valid = 0;
    }
    curl_free(host); curl_free(scheme); curl_free(user); curl_free(password); curl_free(fragment);
    curl_url_cleanup(url);
    return valid;
}

/* PTS from an unscrambled primary-video PES header contained in one TS packet.
 * Blu-ray PES headers normally fit; absence is a safe failure, not a time guess.
 */
static int video_pts(const unsigned char *ts, unsigned pid, uint64_t *pts) {
    if (ts[0] != 0x47 || (ts[1] & 0x80) || (ts[3] & 0xc0) ||
        !(ts[1] & 0x40) || (unsigned)(((ts[1] & 31) << 8) | ts[2]) != pid) return 0;
    unsigned mode = (ts[3] >> 4) & 3;
    if (!(mode & 1)) return 0;
    unsigned offset = 4;
    if (mode & 2) offset += 1 + ts[4];
    if (offset + 14 > 188) return 0;
    const unsigned char *p = ts + offset;
    if (p[0] || p[1] || p[2] != 1 || (p[3] & 0xf0) != 0xe0 ||
        !(p[7] & 0x80) || p[8] < 5 || !(p[9] & 1) || !(p[11] & 1) || !(p[13] & 1)) return 0;
    *pts = ((uint64_t)(p[9] & 14) << 29) | ((uint64_t)p[10] << 22) |
           ((uint64_t)(p[11] & 254) << 14) | ((uint64_t)p[12] << 7) | (p[13] >> 1);
    return 1;
}

int main(int argc, char **argv) {
    double target, duration_hint = -1;
    double preroll = 8, postroll = 8;
    long playlist = -1;
    if (argc < 4 || !number(argv[3], &target))
        return fail("usage: INPUT OUTPUT TARGET_SECONDS [--playlist ID] [--duration SECONDS]");
    for (int i = 4; i < argc; i += 2) {
        if (i + 1 >= argc) return fail("option requires a value");
        if (!strcmp(argv[i], "--playlist")) {
            char *end;
            errno = 0;
            playlist = strtol(argv[i + 1], &end, 10);
            if (errno || end == argv[i + 1] || *end || playlist < 0 || playlist > 99999)
                return fail("invalid playlist ID");
        } else if (!strcmp(argv[i], "--preview")) {
            if (strcmp(argv[i + 1], "1")) return fail("invalid preview flag");
            preroll = 1; postroll = 1;
        } else if (!strcmp(argv[i], "--duration")) {
            if (!number(argv[i + 1], &duration_hint) || duration_hint <= 0)
                return fail("invalid duration hint");
        } else return fail("unknown option");
    }
    bd_set_debug_mask(0); /* libbluray diagnostics can contain paths/URLs. */
    if (curl_global_init(CURL_GLOBAL_DEFAULT)) return fail("libcurl initialization failed");
    Remote remote = {0};
    BLURAY *bd = NULL;
    BLURAY_TITLE_INFO *selected = NULL;
    FILE *out = NULL;
    int created = 0, result = 1;
    const char *error = "cannot open Blu-ray ISO/BDMV (invalid source or unavailable libudfread/decryption dependency)";
    int is_url = strstr(argv[1], "://") != NULL;
    if (is_url) {
        if (!loopback_url(argv[1])) { error = "HTTP input must be a numeric loopback bounded range proxy URL"; goto done; }
        remote.curl = curl_easy_init();
        remote.url = argv[1];
        if (!remote.curl) { error = "libcurl initialization failed"; goto done; }
        curl_easy_setopt(remote.curl, CURLOPT_URL, remote.url);
        curl_easy_setopt(remote.curl, CURLOPT_PROXY, "");
        curl_easy_setopt(remote.curl, CURLOPT_FOLLOWLOCATION, 0L);
        curl_easy_setopt(remote.curl, CURLOPT_CONNECTTIMEOUT, 30L);
        curl_easy_setopt(remote.curl, CURLOPT_TIMEOUT, 0L);
        curl_easy_setopt(remote.curl, CURLOPT_LOW_SPEED_LIMIT, 1L);
        curl_easy_setopt(remote.curl, CURLOPT_LOW_SPEED_TIME, 210L);
        curl_easy_setopt(remote.curl, CURLOPT_WRITEFUNCTION, body);
        curl_easy_setopt(remote.curl, CURLOPT_WRITEDATA, &remote);
        curl_easy_setopt(remote.curl, CURLOPT_HEADERFUNCTION, header);
        curl_easy_setopt(remote.curl, CURLOPT_HEADERDATA, &remote);
        bd = bd_init();
        fprintf(stderr, "disc-stage: opening UDF/BDMV\n");
        if (!bd || !bd_open_stream(bd, &remote, blocks)) goto done;
    } else {
        bd = bd_open(argv[1], NULL);
        if (!bd) goto done;
    }
    const BLURAY_DISC_INFO *disc = bd_get_disc_info(bd);
    if (!disc || !disc->bluray_detected) goto done;
    if ((disc->aacs_detected && !disc->aacs_handled) ||
        (disc->bdplus_detected && !disc->bdplus_handled)) {
        error = "encrypted Blu-ray: AACS/BD+ decryption is unavailable or unsupported"; goto done;
    }
    if (playlist >= 0) {
        selected = bd_get_playlist_info(bd, (uint32_t)playlist, 0);
        if (!selected) { error = "requested playlist metadata unavailable"; goto done; }
    } else {
    fprintf(stderr, "disc-stage: enumerating playlists\n");
    uint32_t titles = bd_get_titles(bd, TITLES_ALL, 0), matches = 0;
    if (titles > 4096) { error = "too many playlists; refusing unbounded metadata enumeration"; goto done; }
    for (uint32_t i = 0; i < titles; ++i) {
        BLURAY_TITLE_INFO *info = bd_get_title_info(bd, i, 0);
        if (!info) { error = "cannot read playlist metadata"; goto done; }
        int match = playlist >= 0 ? info->playlist == (uint32_t)playlist :
            info->duration > (uint64_t)(target * TICKS) &&
            (duration_hint < 0 || fabs(info->duration / TICKS - duration_hint) <= 1.0);
        if (match) {
            fprintf(stderr, "disc-candidate: {\"playlist\":%u,\"durationSec\":%.3f,\"chapters\":%u,\"clips\":%u,\"segments\":[", info->playlist, info->duration / TICKS, info->chapter_count, info->clip_count);
            for (uint32_t j = 0; j < info->clip_count; ++j) {
                const BLURAY_CLIP_INFO *segment = &info->clips[j];
                /* Blu-ray clip IDs are five decimal digits; do not emit raw metadata. */
                char id[6] = "00000";
                for (unsigned k = 0; k < 5; ++k)
                    id[k] = segment->clip_id[k] >= '0' && segment->clip_id[k] <= '9' ? segment->clip_id[k] : '0';
                fprintf(stderr, "%s{\"clipId\":\"%s\",\"inTime\":%" PRIu64 ",\"outTime\":%" PRIu64 ",\"startTime\":%" PRIu64 "}",
                        j ? "," : "", id, segment->in_time, segment->out_time, segment->start_time);
            }
            fprintf(stderr, "]}\n");
            if (!selected) { selected = info; ++matches; }
            else {
                if (!same_title(selected, info)) ++matches;
                bd_free_title_info(info);
            }
        } else bd_free_title_info(info);
    }
    if (matches != 1) {
        error = matches ? "ambiguous playlists: supply --playlist ID (or a unique --duration hint)" :
                          "no matching playlist contains target time";
        goto done;
    }
    }
    uint64_t target_tick = (uint64_t)llround(target * TICKS);
    if (target_tick >= selected->duration || !bd_select_playlist(bd, selected->playlist)) {
        error = "target outside selected title or title selection failed"; goto done;
    }
    BLURAY_CLIP_INFO *clip = NULL;
    uint32_t clip_index = 0;
    for (uint32_t i = 0; i < selected->clip_count; ++i) {
        BLURAY_CLIP_INFO *c = &selected->clips[i];
        if (c->out_time <= c->in_time) continue;
        if (target_tick >= c->start_time && target_tick - c->start_time < c->out_time - c->in_time) {
            if (clip) { error = "overlapping clip timeline cannot be mapped safely"; goto done; }
            clip = c; clip_index = i;
        }
    }
    if (!clip || !clip->video_stream_count) { error = "target has no primary video clip"; goto done; }
    uint64_t source_target = clip->in_time + target_tick - clip->start_time;
    uint64_t clip_end = clip->start_time + clip->out_time - clip->in_time;
    if ((clip->start_time > 0 && target_tick - clip->start_time < (uint64_t)(preroll * TICKS)) ||
        (clip_end < selected->duration && clip_end - target_tick <= (uint64_t)(postroll * TICKS))) {
        error = "target window crosses a playlist clip boundary; cross-clip PTS mapping is unsupported"; goto done;
    }
    if (source_target + (uint64_t)(postroll * TICKS) >= (1ULL << 33)) { error = "PTS wraparound is unsupported"; goto done; }
    uint64_t seek_tick = target_tick > (uint64_t)(preroll * TICKS) ? target_tick - (uint64_t)(preroll * TICKS) : 0;
    if (seek_tick < clip->start_time) seek_tick = clip->start_time;
    fprintf(stderr, "disc-stage: seeking selected playlist\n");
    if (bd_seek_time(bd, seek_tick) < 0) { error = "libbluray time seek failed"; goto done; }
    uint64_t actual_start = bd_tell_time(bd);
    if (actual_start < clip->start_time || actual_start > target_tick) {
        error = "seek landed outside target clip/preroll; cannot map source PTS safely"; goto done;
    }
    int fd = open(argv[2], O_WRONLY | O_CREAT | O_EXCL, 0600);
    if (fd < 0) { error = "cannot create unique output segment"; goto done; }
    created = 1;
    out = fdopen(fd, "wb");
    if (!out) { close(fd); error = "cannot open output segment"; goto done; }
    uint64_t bytes = 0, first_pts = UINT64_MAX, last_pts = 0;
    int covered = 0, stopped = 0;
    uint64_t end_pts = source_target + (uint64_t)(postroll * TICKS);
    if (end_pts >= clip->out_time) end_pts = clip->out_time - 1;
    unsigned char packet[192];
    fprintf(stderr, "disc-stage: reading target segment\n");
    while (bytes + 188 <= MAX_BYTES) {
        if (bd_tell_time(bd) >= clip_end) break;
        int n = bd_read(bd, packet, sizeof(packet));
        if (n < 0 || remote.failed) { error = "bounded disc read failed"; goto done; }
        if (!n) break;
        if (n != 192 || packet[4] != 0x47) { error = "invalid M2TS packet after seek"; goto done; }
        /* Avoid concatenating clips with different PTS origins. */
        if (bd_tell_time(bd) > clip_end) break;
        uint64_t pts;
        if (video_pts(packet + 4, clip->video_streams[0].pid, &pts)) {
            if (pts < clip->in_time || pts >= clip->out_time) {
                error = "video PTS outside selected clip; unsafe timing discontinuity"; goto done;
            }
            /* Keep the complete PES containing the final frame by stopping at
             * the following primary-video PES boundary. */
            if (stopped) break;
            if (pts < first_pts) first_pts = pts;
            if (pts > last_pts) last_pts = pts;
            if (pts >= source_target) covered = 1;
            if (pts >= end_pts) stopped = 1;
        }
        if (fwrite(packet + 4, 1, 188, out) != 188) { error = "segment write failed"; goto done; }
        bytes += 188;
    }
    if (!covered || first_pts == UINT64_MAX || first_pts > source_target ||
        (!stopped && last_pts < source_target + 90000ULL)) {
        error = "bounded segment did not safely cover target (byte budget, missing PTS, or clip boundary)"; goto done;
    }
    if (fclose(out)) { out = NULL; error = "segment flush failed"; goto done; }
    out = NULL;
    printf("{\"version\":1,\"playlist\":%u,\"clipIndex\":%u,\"sourceTargetPts\":%" PRIu64
           ",\"targetSec\":%.9f,\"coarseSec\":%.9f,\"actualTitleStartSec\":%.9f,"
           "\"lastVideoPts\":%" PRIu64 ",\"bytes\":%" PRIu64 ",\"videoPid\":%u,\"pgStreams\":[",
           selected->playlist, clip_index, source_target, source_target / TICKS,
           first_pts / TICKS, actual_start / TICKS, last_pts, bytes, clip->video_streams[0].pid);
    for (unsigned i = 0; i < clip->pg_stream_count; ++i) {
        const BLURAY_STREAM_INFO *stream = &clip->pg_streams[i];
        char language[4] = "und";
        if (stream->lang[0] >= 'a' && stream->lang[0] <= 'z' &&
            stream->lang[1] >= 'a' && stream->lang[1] <= 'z' &&
            stream->lang[2] >= 'a' && stream->lang[2] <= 'z')
            memcpy(language, stream->lang, 3);
        printf("%s{\"pid\":%u,\"language\":\"%s\"}", i ? "," : "", stream->pid, language);
    }
    printf("]}\n");
    result = 0;
done:
    if (out) fclose(out);
    if (result && created) unlink(argv[2]);
    if (selected) bd_free_title_info(selected);
    if (bd) bd_close(bd);
    for (int i = 0; i < 16; ++i) free(remote.saved[i].data);
    if (remote.curl) curl_easy_cleanup(remote.curl);
    curl_global_cleanup();
    if (result) return fail(remote.failed ? "loopback range read failed (requires exact HTTP 206 Content-Range; proxy budget may be exhausted)" : error);
    return 0;
}
