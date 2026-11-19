import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { isCancellationRequested, runCommand } from "./command-runner";

/**
 * Remote capture without asking FFmpeg to seek over HTTP.
 *
 * FFmpeg's TS seek is a binary search; on a link with ~3 s time-to-first-byte
 * every probe step costs a round trip, and its duration estimate re-reads the
 * file tail several times. Worse, a stream copy that maps a sparse subtitle
 * track ignores `-to` and keeps demuxing until that track's next packet or EOF.
 * On a 57 GB remux this never finished within any deadline.
 *
 * Instead: locate the byte window ourselves (TS: sample PES timestamps; MKV:
 * read the Cues index), download exactly that window over several parallel
 * Range connections, and let every FFmpeg step run against a small local file.
 */

export class RemoteWindowUnsupported extends Error {}

export interface RemoteReadStats {
  bytes: number;
  requests: number;
  totalBytes?: number;
  windowBytes?: number;
  format?: string;
}

export type RemoteHeadKind = "disc" | "ts" | "mkv" | "other";

export interface RemoteWindowResult {
  kind: "ts" | "mkv";
  mediaPath: string;
  /** Container start_time of the original file (what players and `ffmpeg -ss` count from). */
  sourceStartSec: number;
  sourceTargetSec: number;
  firstVideoPts: number;
  lastVideoPts: number;
}

const MIB = 1024 * 1024;
const HEAD_BYTES = 3 * MIB;
const SAMPLE_BYTES = 256 * 1024;
const CHUNK_BYTES = 4 * MIB;
const PARALLEL = 6;
const IDLE_TIMEOUT_MS = 45_000;

class RemoteFile {
  readonly stats: RemoteReadStats;
  size = 0;
  private readonly httpAgent = new http.Agent({ keepAlive: true, maxSockets: PARALLEL + 2 });
  private readonly httpsAgent = new https.Agent({ keepAlive: true, maxSockets: PARALLEL + 2 });
  private readonly active = new Set<http.ClientRequest>();
  private readonly cancelPoll: ReturnType<typeof setInterval>;
  private cancelled = false;

  constructor(
    private readonly url: string,
    private readonly maxBytes: number,
    private readonly onProgress?: (stats: RemoteReadStats) => void,
  ) {
    this.stats = { bytes: 0, requests: 0 };
    this.cancelPoll = setInterval(() => {
      if (isCancellationRequested()) {
        this.cancelled = true;
        this.abortAll();
      }
    }, 250);
  }

  abortAll(): void {
    for (const request of this.active) request.destroy(new Error("aborted"));
  }

  close(): void {
    clearInterval(this.cancelPoll);
    this.abortAll();
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }

  /** Read [start, endExclusive), retrying transient network failures. */
  async read(start: number, endExclusive: number): Promise<Buffer> {
    if (this.size > 0) endExclusive = Math.min(endExclusive, this.size);
    if (endExclusive <= start) return Buffer.alloc(0);
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (this.cancelled || isCancellationRequested()) throw new Error("Task stopped manually");
      try {
        const data = await this.readOnce(new URL(this.url), start, endExclusive - 1, 0);
        if (
          data.length !== endExclusive - start &&
          (this.size === 0 || start + data.length < Math.min(endExclusive, this.size))
        ) {
          throw new Error("short read");
        }
        return data;
      } catch (error) {
        if (error instanceof RemoteWindowUnsupported || (error as { fatal?: boolean }).fatal) throw error;
        if (this.cancelled || isCancellationRequested()) throw new Error("Task stopped manually");
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
    const reason =
      lastError instanceof Error && lastError.message === "idle"
        ? `no data for ${IDLE_TIMEOUT_MS / 1000} seconds`
        : "network connection lost";
    throw Object.assign(new Error(`Couldn't read the video segment: ${reason} (retried 4 times).`), { fatal: true });
  }

  private readOnce(url: URL, start: number, endInclusive: number, redirects: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const fatal = (message: string) => Object.assign(new Error(message), { fatal: true });
      if (++this.stats.requests > 4000) {
        reject(fatal("Too many read requests. Stopped."));
        return;
      }
      const request = (url.protocol === "https:" ? https : http).request(
        url,
        {
          method: "GET",
          agent: url.protocol === "https:" ? this.httpsAgent : this.httpAgent,
          headers: { Range: `bytes=${start}-${endInclusive}`, "Accept-Encoding": "identity" },
        },
        (response) => {
          const status = response.statusCode || 0;
          if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
            response.resume();
            if (redirects >= 5) {
              reject(fatal("The video URL redirected too many times."));
              return;
            }
            this.readOnce(new URL(response.headers.location, url), start, endInclusive, redirects + 1).then(
              resolve,
              reject,
            );
            return;
          }
          if (status === 401 || status === 403) {
            response.resume();
            reject(fatal("The server denied access to the video (401/403). Check your token's permissions."));
            return;
          }
          if (status === 200) {
            response.destroy();
            reject(new RemoteWindowUnsupported("The server doesn't support byte-range reads (returned 200)."));
            return;
          }
          if (status === 416) {
            response.resume();
            reject(fatal("The requested position is beyond the end of the video file."));
            return;
          }
          if (status !== 206) {
            response.resume();
            reject(new Error(`HTTP ${status}`));
            return;
          }
          const type = String(response.headers["content-type"] || "");
          if (/html|json|xml/i.test(type)) {
            response.destroy();
            reject(fatal(`The video URL returned a web page or API text (${type}) instead of the original video.`));
            return;
          }
          const range = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(String(response.headers["content-range"] || ""));
          if (!range || Number(range[1]) !== start) {
            response.destroy();
            reject(new RemoteWindowUnsupported("The server returned a byte range that doesn't match the request."));
            return;
          }
          if (range[3] !== "*") {
            this.size = Number(range[3]);
            this.stats.totalBytes = this.size;
          }
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
            this.stats.bytes += chunk.length;
            if (this.stats.bytes > this.maxBytes) {
              response.destroy();
              reject(fatal(`This capture read more than ${Math.round(this.maxBytes / MIB)} MiB. Reading stopped.`));
            }
          });
          response.on("end", () => {
            this.onProgress?.(this.stats);
            resolve(Buffer.concat(chunks));
          });
          response.on("error", reject);
          response.on("aborted", () => reject(new Error("aborted")));
        },
      );
      this.active.add(request);
      request.once("close", () => this.active.delete(request));
      request.setTimeout(IDLE_TIMEOUT_MS, () => request.destroy(new Error("idle")));
      request.once("error", (error) => {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOTFOUND") reject(fatal("Couldn't resolve the video server's hostname."));
        else reject(error);
      });
      request.end();
    });
  }

  /** Download [start, endExclusive) into fd at fileOffset using parallel Range requests. */
  async downloadTo(fd: number, fileOffset: number, start: number, endExclusive: number): Promise<void> {
    const jobs: Array<[number, number]> = [];
    for (let s = start; s < endExclusive; s += CHUNK_BYTES) jobs.push([s, Math.min(s + CHUNK_BYTES, endExclusive)]);
    let next = 0;
    let failure: unknown;
    const worker = async () => {
      while (failure === undefined && next < jobs.length) {
        const [a, b] = jobs[next++];
        try {
          const data = await this.read(a, b);
          await new Promise<void>((resolve, reject) =>
            fs.write(fd, data, 0, data.length, fileOffset + (a - start), (error) =>
              error ? reject(error) : resolve(),
            ),
          );
        } catch (error) {
          failure ??= error;
          this.abortAll();
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, jobs.length) }, worker));
    if (failure !== undefined) throw failure;
  }
}

async function readHead(file: RemoteFile): Promise<Buffer> {
  // First request learns the size; split the rest so a slow link uses several connections.
  const first = await file.read(0, MIB);
  if (file.size > 0 && file.size <= MIB) return first;
  const parts = await Promise.all([file.read(MIB, 2 * MIB), file.read(2 * MIB, HEAD_BYTES)]);
  return Buffer.concat([first, ...parts]);
}

export function classifyHead(head: Buffer): RemoteHeadKind {
  for (let offset = 32768; offset + 6 <= Math.min(head.length, 65536); offset += 2048) {
    if (["CD001", "BEA01", "NSR02", "NSR03"].includes(head.subarray(offset + 1, offset + 6).toString("ascii")))
      return "disc";
  }
  if (head.length >= 4 && head.readUInt32BE(0) === 0x1a45dfa3) return "mkv";
  if (detectTsLayout(head)) return "ts";
  return "other";
}

/* ------------------------------------------------------------------ TS ---- */

interface TsLayout {
  packetSize: 188 | 192;
  syncOffset: number;
}

function detectTsLayout(buf: Buffer, from = 0): TsLayout | undefined {
  for (const packetSize of [188, 192] as const) {
    for (let o = from; o < from + packetSize && o + packetSize * 15 < buf.length; o++) {
      let ok = true;
      for (let k = 0; k < 16; k++)
        if (buf[o + k * packetSize] !== 0x47) {
          ok = false;
          break;
        }
      if (ok) return { packetSize, syncOffset: o };
    }
  }
  return undefined;
}

const VIDEO_STREAM_TYPES = new Set([0x01, 0x02, 0x10, 0x1b, 0x24, 0x33, 0xea]);
const NO_PTS_STREAM_IDS = new Set([0xbc, 0xbe, 0xbf, 0xf0, 0xf1, 0xf2, 0xf8, 0xff]);

function readPesTimestamp(b: Buffer, i: number): number {
  return (
    ((b[i] >> 1) & 0x07) * 1073741824 + ((b[i + 1] << 22) | ((b[i + 2] >> 1) << 15) | (b[i + 3] << 7) | (b[i + 4] >> 1))
  );
}

interface TsScan {
  video: number[];
  other: number[];
  pcr: number[];
  videoPid?: number;
}

function scanTs(buf: Buffer, layout: TsLayout, knownVideoPid?: number): TsScan {
  const out: TsScan = { video: [], other: [], pcr: [], videoPid: knownVideoPid };
  const pmtPids = new Set<number>();
  for (let p = layout.syncOffset; p + 188 <= buf.length; p += layout.packetSize) {
    if (buf[p] !== 0x47) continue;
    const pid = ((buf[p + 1] & 0x1f) << 8) | buf[p + 2];
    const pusi = (buf[p + 1] & 0x40) !== 0;
    const afc = (buf[p + 3] >> 4) & 3;
    let off = p + 4;
    if (afc & 2) {
      const alen = buf[off];
      if (alen >= 7 && buf[off + 1] & 0x10) {
        out.pcr.push(
          buf[off + 2] * 33554432 + buf[off + 3] * 131072 + buf[off + 4] * 512 + buf[off + 5] * 2 + (buf[off + 6] >> 7),
        );
      }
      off += 1 + alen;
    }
    if (!(afc & 1) || !pusi || off + 19 > p + 188) continue;
    if (pid === 0) {
      const t = off + 1 + buf[off];
      const end = Math.min(t + 3 + (((buf[t + 1] & 0x0f) << 8) | buf[t + 2]) - 4, p + 188);
      for (let i = t + 8; i + 4 <= end; i += 4) {
        if (((buf[i] << 8) | buf[i + 1]) !== 0) pmtPids.add(((buf[i + 2] & 0x1f) << 8) | buf[i + 3]);
      }
      continue;
    }
    if (pmtPids.has(pid) && out.videoPid === undefined) {
      const t = off + 1 + buf[off];
      if (buf[t] !== 0x02) continue;
      const end = Math.min(t + 3 + (((buf[t + 1] & 0x0f) << 8) | buf[t + 2]) - 4, p + 188);
      let i = t + 12 + (((buf[t + 10] & 0x0f) << 8) | buf[t + 11]);
      while (i + 5 <= end) {
        if (VIDEO_STREAM_TYPES.has(buf[i])) {
          out.videoPid = ((buf[i + 1] & 0x1f) << 8) | buf[i + 2];
          break;
        }
        i += 5 + (((buf[i + 3] & 0x0f) << 8) | buf[i + 4]);
      }
      continue;
    }
    if (buf[off] !== 0 || buf[off + 1] !== 0 || buf[off + 2] !== 1 || NO_PTS_STREAM_IDS.has(buf[off + 3])) continue;
    const flags = buf[off + 7] >> 6;
    if (!(flags & 2)) continue;
    const pts = readPesTimestamp(buf, off + 9);
    const dts = flags === 3 ? readPesTimestamp(buf, off + 14) : pts;
    (pid === out.videoPid ? out.video : out.other).push(dts);
  }
  return out;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const WRAP = 2 ** 33;

class TsLocator {
  constructor(
    private readonly file: RemoteFile,
    private readonly layout: TsLayout,
    private readonly videoPid: number | undefined,
    private readonly referenceRaw: number,
  ) {}

  align(pos: number): number {
    const base = this.layout.syncOffset - (this.layout.packetSize === 192 ? 4 : 0);
    return Math.max(0, base + Math.floor((pos - base) / this.layout.packetSize) * this.layout.packetSize);
  }

  seconds(raw: number): number {
    let value = raw;
    while (value < this.referenceRaw - WRAP / 2) value += WRAP;
    return value / 90000;
  }

  async timeAt(pos: number): Promise<number | undefined> {
    const start = this.align(Math.min(Math.max(0, pos), Math.max(0, this.file.size - SAMPLE_BYTES)));
    const buf = await this.file.read(start, start + SAMPLE_BYTES);
    const layout = detectTsLayout(buf);
    if (!layout) return undefined;
    const scan = scanTs(buf, layout, this.videoPid);
    const raw = median(scan.video) ?? median(scan.other) ?? median(scan.pcr);
    return raw === undefined ? undefined : this.seconds(raw);
  }

  /** before: returns a position whose time is <= target; after: a position whose time is >= target. */
  async locate(target: number, mode: "before" | "after", startSec: number, endSec: number): Promise<number> {
    let lo = { pos: 0, t: startSec };
    let hi = { pos: this.file.size, t: endSec };
    if (mode === "before" && target <= startSec) return 0;
    if (mode === "after" && target >= endSec) return this.file.size;
    for (let iteration = 0; iteration < 16; iteration++) {
      const span = hi.pos - lo.pos;
      if (span <= SAMPLE_BYTES * 4) break;
      let guess = lo.pos + ((target - lo.t) / Math.max(1e-6, hi.t - lo.t)) * span;
      guess = Math.min(Math.max(guess, lo.pos + span * 0.01), hi.pos - span * 0.01);
      const t = await this.timeAt(guess);
      if (t === undefined) throw new RemoteWindowUnsupported("No usable timestamp in the TS sample.");
      // Timestamps that leave the bracket mean a discontinuity (joined playlists).
      if (t < lo.t - 10 || t > hi.t + 10)
        throw new RemoteWindowUnsupported("TS timestamps are discontinuous; can't seek by byte offset.");
      if (t <= target) {
        lo = { pos: guess, t };
        if (mode === "before" && target - t <= 2.5) break;
      } else {
        hi = { pos: guess, t };
        if (mode === "after" && t - target <= 2.5) break;
      }
    }
    return mode === "before" ? this.align(lo.pos) : this.align(hi.pos + SAMPLE_BYTES);
  }
}

/* ----------------------------------------------------------------- MKV ---- */

const MKV = {
  EBML: 0x1a45dfa3,
  Segment: 0x18538067,
  SeekHead: 0x114d9b74,
  Seek: 0x4dbb,
  SeekID: 0x53ab,
  SeekPosition: 0x53ac,
  Info: 0x1549a966,
  TimestampScale: 0x2ad7b1,
  Tracks: 0x1654ae6b,
  TrackEntry: 0xae,
  TrackNumber: 0xd7,
  TrackType: 0x83,
  Cues: 0x1c53bb6b,
  CuePoint: 0xbb,
  CueTime: 0xb3,
  CueTrackPositions: 0xb7,
  CueTrack: 0xf7,
  CueClusterPosition: 0xf1,
  Cluster: 0x1f43b675,
};

interface EbmlElement {
  id: number;
  pos: number;
  dataPos: number;
  size: number;
  end: number;
}

function readVint(
  b: Buffer,
  i: number,
  keepMarker: boolean,
): { value: number; length: number; unknown: boolean } | undefined {
  if (i >= b.length) return undefined;
  const first = b[i];
  if (first === 0) return undefined;
  let length = 1;
  while (!(first & (0x80 >> (length - 1)))) length++;
  if (i + length > b.length) return undefined;
  let value = keepMarker ? first : first & (0xff >> length);
  let allOnes = value === 0xff >> length;
  for (let k = 1; k < length; k++) {
    value = value * 256 + b[i + k];
    if (b[i + k] !== 0xff) allOnes = false;
  }
  return { value, length, unknown: !keepMarker && allOnes };
}

function readElement(b: Buffer, i: number, base = 0): EbmlElement | undefined {
  const id = readVint(b, i, true);
  if (!id || id.length > 4) return undefined;
  const size = readVint(b, i + id.length, false);
  if (!size) return undefined;
  const dataPos = i + id.length + size.length;
  const length = size.unknown ? Infinity : size.value;
  return { id: id.value, pos: base + i, dataPos: base + dataPos, size: length, end: base + dataPos + length };
}

function children(b: Buffer, start: number, end: number): Array<EbmlElement & { local: number }> {
  const out: Array<EbmlElement & { local: number }> = [];
  let i = start;
  while (i < Math.min(end, b.length)) {
    const element = readElement(b, i);
    if (!element || !Number.isFinite(element.size)) break;
    out.push({ ...element, local: element.dataPos });
    i = element.end;
  }
  return out;
}

function readUint(b: Buffer, start: number, size: number): number {
  let value = 0;
  for (let k = 0; k < size; k++) value = value * 256 + b[start + k];
  return value;
}

interface MkvLayout {
  ebmlHeader: Buffer;
  info: Buffer;
  tracks: Buffer;
  segmentDataPos: number;
  segmentEnd: number;
  firstCluster: number;
  timestampScale: number;
  videoTrack?: number;
  cues: Array<{ time: number; track: number; pos: number }>;
}

async function readMkvLayout(file: RemoteFile, head: Buffer): Promise<MkvLayout> {
  const ebml = readElement(head, 0);
  if (!ebml || ebml.id !== MKV.EBML || !Number.isFinite(ebml.end))
    throw new RemoteWindowUnsupported("Invalid MKV header.");
  const segment = readElement(head, ebml.end);
  if (!segment || segment.id !== MKV.Segment) throw new RemoteWindowUnsupported("MKV is missing a Segment.");
  const segmentDataPos = segment.dataPos;
  const segmentEnd = Number.isFinite(segment.end) ? Math.min(segment.end, file.size || segment.end) : file.size;

  const fetchElement = async (pos: number): Promise<{ element: EbmlElement; bytes: Buffer }> => {
    const peek = pos + 16 <= head.length ? head.subarray(pos, pos + 16) : await file.read(pos, pos + 16);
    const element = readElement(peek, 0, pos);
    if (!element || !Number.isFinite(element.size)) throw new RemoteWindowUnsupported("Couldn't parse an MKV element.");
    if (element.end - pos > 64 * MIB) throw new RemoteWindowUnsupported("MKV index is too large.");
    const bytes = element.end <= head.length ? head.subarray(pos, element.end) : await file.read(pos, element.end);
    return { element, bytes };
  };

  const positions = new Map<number, number>();
  let firstCluster = 0;
  let pos = segmentDataPos;
  for (let hop = 0; hop < 64 && pos < segmentEnd; hop++) {
    const peek = pos + 16 <= head.length ? head.subarray(pos, pos + 16) : await file.read(pos, pos + 16);
    const element = readElement(peek, 0, pos);
    if (!element) break;
    if (element.id === MKV.Cluster) {
      firstCluster = pos;
      break;
    }
    if (!positions.has(element.id)) positions.set(element.id, pos);
    if (!Number.isFinite(element.size)) break;
    pos = element.end;
  }
  if (!firstCluster) throw new RemoteWindowUnsupported("No video clusters found in the MKV.");

  const seekHeadPos = positions.get(MKV.SeekHead);
  if (seekHeadPos !== undefined) {
    const { element, bytes } = await fetchElement(seekHeadPos);
    for (const seek of children(bytes, element.dataPos - seekHeadPos, bytes.length)) {
      if (seek.id !== MKV.Seek) continue;
      let id = 0;
      let position = -1;
      for (const field of children(bytes, seek.local, seek.local + seek.size)) {
        if (field.id === MKV.SeekID) id = readUint(bytes, field.local, field.size);
        if (field.id === MKV.SeekPosition) position = readUint(bytes, field.local, field.size);
      }
      if (id && position >= 0 && !positions.has(id)) positions.set(id, segmentDataPos + position);
    }
  }
  const infoPos = positions.get(MKV.Info);
  const tracksPos = positions.get(MKV.Tracks);
  const cuesPos = positions.get(MKV.Cues);
  if (infoPos === undefined || tracksPos === undefined)
    throw new RemoteWindowUnsupported("MKV is missing Info/Tracks.");
  if (cuesPos === undefined) throw new RemoteWindowUnsupported("MKV has no Cues index.");

  const [info, tracks, cues] = await Promise.all([
    fetchElement(infoPos),
    fetchElement(tracksPos),
    fetchElement(cuesPos),
  ]);

  let timestampScale = 1_000_000;
  for (const field of children(info.bytes, info.element.dataPos - infoPos, info.bytes.length)) {
    if (field.id === MKV.TimestampScale) timestampScale = readUint(info.bytes, field.local, field.size);
  }
  let videoTrack: number | undefined;
  for (const entry of children(tracks.bytes, tracks.element.dataPos - tracksPos, tracks.bytes.length)) {
    if (entry.id !== MKV.TrackEntry) continue;
    let number = 0;
    let type = 0;
    for (const field of children(tracks.bytes, entry.local, entry.local + entry.size)) {
      if (field.id === MKV.TrackNumber) number = readUint(tracks.bytes, field.local, field.size);
      if (field.id === MKV.TrackType) type = readUint(tracks.bytes, field.local, field.size);
    }
    if (type === 1) {
      videoTrack = number;
      break;
    }
  }

  const cuePoints: MkvLayout["cues"] = [];
  for (const point of children(cues.bytes, cues.element.dataPos - cuesPos, cues.bytes.length)) {
    if (point.id !== MKV.CuePoint) continue;
    let time = -1;
    const tracksAt: Array<{ track: number; pos: number }> = [];
    for (const field of children(cues.bytes, point.local, point.local + point.size)) {
      if (field.id === MKV.CueTime) time = readUint(cues.bytes, field.local, field.size);
      if (field.id === MKV.CueTrackPositions) {
        let track = 0;
        let cluster = -1;
        for (const sub of children(cues.bytes, field.local, field.local + field.size)) {
          if (sub.id === MKV.CueTrack) track = readUint(cues.bytes, sub.local, sub.size);
          if (sub.id === MKV.CueClusterPosition) cluster = readUint(cues.bytes, sub.local, sub.size);
        }
        if (cluster >= 0) tracksAt.push({ track, pos: segmentDataPos + cluster });
      }
    }
    if (time >= 0) for (const entry of tracksAt) cuePoints.push({ time: (time * timestampScale) / 1e9, ...entry });
  }
  const forVideo = cuePoints.filter((cue) => cue.track === videoTrack);
  const selected = (forVideo.length ? forVideo : cuePoints).sort((a, b) => a.time - b.time);
  if (selected.length < 2) throw new RemoteWindowUnsupported("MKV index has too few entries.");
  for (let i = 1; i < selected.length; i++) {
    if (selected[i].pos < selected[i - 1].pos)
      throw new RemoteWindowUnsupported("MKV index positions aren't monotonically increasing.");
  }

  return {
    ebmlHeader: head.subarray(0, ebml.end),
    info: info.bytes,
    tracks: tracks.bytes,
    segmentDataPos,
    segmentEnd,
    firstCluster,
    timestampScale,
    videoTrack,
    cues: selected,
  };
}

function mkvSyntheticHeader(layout: MkvLayout): Buffer {
  // Unknown-size Segment: the local file holds header elements plus a run of whole clusters.
  const segment = Buffer.from([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  return Buffer.concat([layout.ebmlHeader, segment, layout.info, layout.tracks]);
}

/* -------------------------------------------------------------- shared ---- */

async function probeStartTime(ffprobePath: string, file: string, env?: NodeJS.ProcessEnv): Promise<number> {
  const { stdout } = await runCommand(
    ffprobePath,
    ["-v", "error", "-show_entries", "format=start_time", "-of", "default=nw=1:nk=1", file],
    { env, timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
  const value = Number(stdout.trim());
  if (!Number.isFinite(value))
    throw new RemoteWindowUnsupported("Couldn't determine the start time from the file header.");
  return value;
}

async function videoPtsRange(
  ffprobePath: string,
  file: string,
  env?: NodeJS.ProcessEnv,
): Promise<{ first: number; last: number }> {
  const { stdout } = await runCommand(
    ffprobePath,
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time", "-of", "csv=p=0", file],
    { env, timeout: 120_000, maxBuffer: 32 * MIB },
  );
  // csv rows can carry a trailing separator ("613.847167,"), so take the first field.
  const values = stdout
    .split("\n")
    .map((line) => line.split(",")[0].trim())
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite);
  if (values.length < 2) return { first: NaN, last: NaN };
  return { first: Math.min(...values), last: Math.max(...values) };
}

async function writeFile(target: string, data: Buffer): Promise<void> {
  await fs.promises.writeFile(target, data);
}

export interface RemoteWindowRequest {
  url: string;
  targetPlayerSec: number;
  prerollSec: number;
  postrollSec: number;
  durationHintSec?: number;
  workDir: string;
  ffprobePath: string;
  env?: NodeJS.ProcessEnv;
  maxBytes: number;
  maxWindowBytes: number;
  onProgress?: (stats: RemoteReadStats) => void;
  onStage?: (stage: string) => void;
}

export interface RemoteWindowSession {
  kind: RemoteHeadKind;
  stats: RemoteReadStats;
  /** Only valid when kind is "ts" or "mkv". */
  fetch(): Promise<RemoteWindowResult>;
  close(): void;
}

/** Sniff the remote file once; callers branch on `kind` before fetching the window. */
export async function openRemoteWindow(request: RemoteWindowRequest): Promise<RemoteWindowSession> {
  const file = new RemoteFile(request.url, request.maxBytes, request.onProgress);
  let head: Buffer;
  try {
    head = await readHead(file);
  } catch (error) {
    file.close();
    throw error;
  }
  const kind = classifyHead(head);
  file.stats.format = kind;
  return {
    kind,
    stats: file.stats,
    close: () => file.close(),
    fetch: () =>
      kind === "ts"
        ? fetchTsWindow(file, head, request)
        : kind === "mkv"
          ? fetchMkvWindow(file, head, request)
          : Promise.reject(new RemoteWindowUnsupported("Not a TS/MKV file.")),
  };
}

async function fetchTsWindow(
  file: RemoteFile,
  head: Buffer,
  request: RemoteWindowRequest,
): Promise<RemoteWindowResult> {
  const layout = detectTsLayout(head);
  if (!layout) throw new RemoteWindowUnsupported("Invalid TS sync bytes.");
  const headScan = scanTs(head, layout);
  const headRaw = median(headScan.video) ?? median(headScan.other) ?? median(headScan.pcr);
  if (headRaw === undefined) throw new RemoteWindowUnsupported("TS header has no timestamp.");

  const headPath = path.join(request.workDir, "_head.ts");
  await writeFile(headPath, head);
  const [sourceStartSec, tailBuf] = await Promise.all([
    probeStartTime(request.ffprobePath, headPath, request.env).finally(() => fs.rmSync(headPath, { force: true })),
    file.read(Math.max(0, file.size - SAMPLE_BYTES), file.size),
  ]);
  const locator = new TsLocator(file, layout, headScan.videoPid, headRaw);
  const startSec = locator.seconds(headRaw);
  const tailLayout = detectTsLayout(tailBuf);
  const tailScan = tailLayout ? scanTs(tailBuf, tailLayout, headScan.videoPid) : undefined;
  const tailRaw = tailScan ? (median(tailScan.video) ?? median(tailScan.other) ?? median(tailScan.pcr)) : undefined;
  const endSec =
    tailRaw !== undefined
      ? locator.seconds(tailRaw)
      : request.durationHintSec
        ? startSec + request.durationHintSec
        : NaN;
  if (!Number.isFinite(endSec) || endSec <= startSec)
    throw new RemoteWindowUnsupported("Couldn't determine the TS duration.");

  const sourceTargetSec = sourceStartSec + request.targetPlayerSec;
  const output = path.join(request.workDir, "_window.ts");
  for (let attempt = 0; attempt < 2; attempt++) {
    const extraPre = attempt * 6;
    const extraPost = attempt * 4;
    request.onStage?.("Locating the target frame in the remote file…");
    const [a, b] = await Promise.all([
      locator.locate(sourceTargetSec - request.prerollSec - 1.5 - extraPre, "before", startSec, endSec),
      locator.locate(sourceTargetSec + request.postrollSec + 1.5 + extraPost, "after", startSec, endSec),
    ]);
    if (b <= a) throw new RemoteWindowUnsupported("Invalid TS seek range.");
    if (b - a > request.maxWindowBytes)
      throw new Error(`The segment near the target is too large (${Math.round((b - a) / MIB)} MiB). Reading stopped.`);
    file.stats.windowBytes = b - a;
    request.onStage?.(`Downloading ${Math.round((b - a) / MIB)} MiB near the target (${PARALLEL} parallel streams)…`);
    const fd = fs.openSync(output, "w");
    try {
      await file.downloadTo(fd, 0, a, b);
    } finally {
      fs.closeSync(fd);
    }
    const range = await videoPtsRange(request.ffprobePath, output, request.env);
    if (range.first <= sourceTargetSec - Math.min(1, request.prerollSec) && range.last >= sourceTargetSec + 0.1) {
      return {
        kind: "ts",
        mediaPath: output,
        sourceStartSec,
        sourceTargetSec,
        firstVideoPts: range.first,
        lastVideoPts: range.last,
      };
    }
  }
  fs.rmSync(output, { force: true });
  throw new RemoteWindowUnsupported("The downloaded TS segment doesn't cover the target time.");
}

async function fetchMkvWindow(
  file: RemoteFile,
  head: Buffer,
  request: RemoteWindowRequest,
): Promise<RemoteWindowResult> {
  request.onStage?.("Reading MKV index…");
  const layout = await readMkvLayout(file, head);
  const header = mkvSyntheticHeader(layout);

  // start_time comes from the first packets, exactly as FFmpeg computes it on the full file.
  const startProbe = path.join(request.workDir, "_head.mkv");
  const firstClusterBytes =
    layout.firstCluster + 2 * MIB <= head.length
      ? head.subarray(layout.firstCluster, layout.firstCluster + 2 * MIB)
      : await file.read(layout.firstCluster, layout.firstCluster + 2 * MIB);
  await writeFile(startProbe, Buffer.concat([header, firstClusterBytes]));
  const sourceStartSec = await probeStartTime(request.ffprobePath, startProbe, request.env).finally(() =>
    fs.rmSync(startProbe, { force: true }),
  );

  const sourceTargetSec = sourceStartSec + request.targetPlayerSec;
  const output = path.join(request.workDir, "_window.mkv");
  for (let attempt = 0; attempt < 2; attempt++) {
    const from = sourceTargetSec - request.prerollSec - 0.5 - attempt * 6;
    const to = sourceTargetSec + request.postrollSec + 0.5 + attempt * 4;
    const before = layout.cues.filter((cue) => cue.time <= from);
    const a = before.length ? before[before.length - 1].pos : layout.firstCluster;
    const b = layout.cues.find((cue) => cue.time >= to)?.pos ?? layout.segmentEnd;
    if (b <= a) throw new RemoteWindowUnsupported("Invalid MKV seek range.");
    if (b - a > request.maxWindowBytes)
      throw new Error(`The segment near the target is too large (${Math.round((b - a) / MIB)} MiB). Reading stopped.`);
    file.stats.windowBytes = b - a;
    request.onStage?.(`Downloading ${Math.round((b - a) / MIB)} MiB near the target (${PARALLEL} parallel streams)…`);
    const fd = fs.openSync(output, "w");
    try {
      fs.writeSync(fd, header, 0, header.length, 0);
      await file.downloadTo(fd, header.length, a, b);
    } finally {
      fs.closeSync(fd);
    }
    const range = await videoPtsRange(request.ffprobePath, output, request.env);
    if (range.first <= sourceTargetSec && range.last >= sourceTargetSec) {
      return {
        kind: "mkv",
        mediaPath: output,
        sourceStartSec,
        sourceTargetSec,
        firstVideoPts: range.first,
        lastVideoPts: range.last,
      };
    }
  }
  fs.rmSync(output, { force: true });
  throw new RemoteWindowUnsupported("The downloaded MKV segment doesn't cover the target time.");
}
