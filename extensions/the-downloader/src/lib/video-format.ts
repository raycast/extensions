/**
 * Map a generic video-quality token (the `videoQuality` preference) to a
 * yt-dlp `-f` format selector string for the given output `container`. Any
 * unrecognised quality token resolves to the uncapped best-quality selector.
 *
 * For `mp4` the selector prefers H.264 (avc1) video + AAC (m4a) audio so the
 * chosen streams remux losslessly into a QuickTime-playable mp4 (no re-encode).
 * The filter is on the *codec*, not the container: YouTube ships AV1 and VP9 at
 * the top resolutions (AV1 even inside an mp4 box), and neither plays reliably
 * in QuickTime — so `[ext=mp4]` is not enough, it must be `[vcodec^=avc1]`.
 * H.264 caps at 1080p on YouTube, the accepted tradeoff for "an mp4 that always
 * opens". WebM only holds VP8/VP9/AV1 + Opus/Vorbis, so it prefers WebM streams
 * and falls back to any (merged into mkv by `buildVideoDownloadArgs`). mkv takes
 * any codec, so `--merge-output-format` alone sets the box.
 */
export function videoFormatSelector(quality: string, container: string): string {
  const cap = quality === "1080" || quality === "720" || quality === "480" ? `[height<=${quality}]` : "";
  const stem = quality === "smallest" ? "worst" : "best";
  const v = `${stem}video${cap}`;
  const a = `${stem}audio`;
  if (container === "mp4") {
    // H.264+AAC first, then a progressive H.264 file, then any best streams.
    return `${v}[vcodec^=avc1]+${a}[ext=m4a]/${stem}${cap}[vcodec^=avc1]/${v}+${a}/${stem}${cap}`;
  }
  if (container === "webm") {
    return `${v}[ext=webm]+${a}[ext=webm]/${stem}${cap}[ext=webm]/${v}+${a}/${stem}${cap}`;
  }
  return `${v}+${a}/${stem}${cap}`;
}

/**
 * Compose the `format` string consumed by `buildVideoDownloadArgs` from the
 * Section 1 download defaults. Audio downloads become `bestaudio#<audioFormat>`;
 * video downloads become `<quality selector>#<container>`. The `#` separates the
 * download-format selector from the merge container (video) or audio-extract
 * target (audio).
 */
export function composeVideoFormat(o: {
  mediaType: "video" | "audio";
  quality: string;
  container: string;
  audioFormat: string;
}): string {
  if (o.mediaType === "audio") {
    return `bestaudio#${o.audioFormat}`;
  }
  return `${videoFormatSelector(o.quality, o.container)}#${o.container}`;
}
