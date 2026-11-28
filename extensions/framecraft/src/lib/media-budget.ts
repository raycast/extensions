import { PlaybackProbeResult } from "./types";

export interface MediaBudget {
  /** HTTP Range locate phase deadline before target region is reached */
  locateTimeoutMs: number;
  /** Per-connection idle timeout on upstream HTTP Range stream */
  socketIdleTimeoutMs: number;
  /** Maximum HTTP Range requests per capture/compose task */
  maxRangeRequests: number;
  /** Maximum total bytes read over HTTP Range for a single task */
  maxRangeBytes: number;
  /** Maximum local cached/preroll fragment size in bytes */
  maxSegmentBytes: number;
  /** Timeout for ffprobe container/stream inspection */
  probeTimeoutMs: number;
  /** Timeout for pulling the preroll segment around target timestamp */
  prerollTimeoutMs: number;
  /** Timeout for decoding and selecting the exact video frame */
  frameDecodeTimeoutMs: number;
  /** Timeout per subtitle track extraction/rendering */
  subtitleExtractTimeoutMs: number;
}

const GIB = 1024 * 1024 * 1024;
const MIB = 1024 * 1024;

export const MAX_CLIP_DURATION_SECONDS = 20 * 60;

/** Scale time and byte budgets dynamically with media file size / bitrate so
 * massive 4K Remux / ISO movies (e.g. 150–250 GB) do not hit small-file caps. */
export function computeMediaBudget(
  probe?: Pick<PlaybackProbeResult, "sizeBytes" | "bitrateBps" | "durationSec" | "isRemote">,
  learnedTotalBytes?: number,
): MediaBudget {
  const knownBytes = Math.max(probe?.sizeBytes ?? 0, learnedTotalBytes ?? 0);
  const estimatedBytes =
    knownBytes > 0
      ? knownBytes
      : probe?.bitrateBps && probe?.durationSec
        ? Math.round((probe.bitrateBps / 8) * probe.durationSec)
        : 0;

  const sizeGib = estimatedBytes / GIB;

  // Tier 3: Huge movies (>= 80 GiB, e.g. 190 GB UHD / Remux / high-bitrate master)
  if (sizeGib >= 80) {
    const scale = Math.min(2.0, Math.max(1.0, sizeGib / 120));
    return {
      locateTimeoutMs: Math.round(360_000 * scale),
      socketIdleTimeoutMs: 240_000,
      maxRangeRequests: 6144,
      maxRangeBytes: 6 * GIB,
      maxSegmentBytes: Math.round(2560 * MIB),
      probeTimeoutMs: 120_000,
      prerollTimeoutMs: Math.round(480_000 * scale),
      frameDecodeTimeoutMs: 180_000,
      subtitleExtractTimeoutMs: 180_000,
    };
  }

  // Tier 2: Large movies (20 GiB – 80 GiB)
  if (sizeGib >= 20) {
    return {
      locateTimeoutMs: 240_000,
      socketIdleTimeoutMs: 150_000,
      maxRangeRequests: 3072,
      maxRangeBytes: 3 * GIB,
      maxSegmentBytes: 1536 * MIB,
      probeTimeoutMs: 75_000,
      prerollTimeoutMs: 300_000,
      frameDecodeTimeoutMs: 120_000,
      subtitleExtractTimeoutMs: 120_000,
    };
  }

  // Tier 1: Standard files or unknown remote streams (remote gets generous baseline
  // until Content-Range reveals exact size and upgrades RangeSource on the fly)
  const remoteUnknown = Boolean(probe?.isRemote && estimatedBytes === 0);
  return {
    locateTimeoutMs: remoteUnknown ? 240_000 : 120_000,
    socketIdleTimeoutMs: remoteUnknown ? 150_000 : 90_000,
    maxRangeRequests: remoteUnknown ? 3072 : 1024,
    maxRangeBytes: remoteUnknown ? 4 * GIB : 1536 * MIB,
    maxSegmentBytes: remoteUnknown ? 2048 * MIB : 768 * MIB,
    probeTimeoutMs: remoteUnknown ? 90_000 : 45_000,
    prerollTimeoutMs: remoteUnknown ? 360_000 : 150_000,
    frameDecodeTimeoutMs: remoteUnknown ? 150_000 : 90_000,
    subtitleExtractTimeoutMs: 120_000,
  };
}
