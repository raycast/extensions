import { runProcess } from "./process";
import type { VideoCodec, VideoPreset } from "../types/media";

/** Parse the encoder names out of `ffmpeg -hide_banner -encoders` output. */
export function parseEncoderList(stdout: string): Set<string> {
  const encoders = new Set<string>();
  const lines = stdout.split("\n");
  const start = lines.findIndex((line) => line.trim().startsWith("------"));
  for (const line of lines.slice(start + 1)) {
    // " V....D libx264              libx264 H.264 / AVC / MPEG-4 AVC ..."
    const match = line.match(/^\s*[VAS][A-Z.]{5}\s+(\S+)/);
    if (match) encoders.add(match[1]);
  }
  return encoders;
}

const encoderCache = new Map<string, Promise<Set<string> | null>>();

/**
 * The encoders the given FFmpeg build includes, or null if they can't be listed.
 * Builds differ a lot: Homebrew's `ffmpeg` formula ships without libwebp or libaom.
 */
export function getAvailableEncoders(ffmpegPath: string): Promise<Set<string> | null> {
  let encoders = encoderCache.get(ffmpegPath);
  if (!encoders) {
    encoders = runProcess({ command: ffmpegPath, args: ["-hide_banner", "-encoders"] })
      .then(({ stdout }) => {
        const parsed = parseEncoderList(stdout);
        return parsed.size > 0 ? parsed : null;
      })
      .catch(() => null);
    encoderCache.set(ffmpegPath, encoders);
  }
  return encoders;
}

/**
 * Pick the AV1 encoder for AVIF images: libaom-av1 when present, otherwise libsvtav1.
 * When the encoder list is unknown, keep libaom-av1.
 */
export function pickAvifEncoder(encoders: Set<string> | null): "libaom-av1" | "libsvtav1" | null {
  if (!encoders || encoders.has("libaom-av1")) return "libaom-av1";
  if (encoders.has("libsvtav1")) return "libsvtav1";
  return null;
}

/** The encoder arguments for an AVIF image at the given quality (0 to 100). */
export function buildAvifArgs(encoder: "libaom-av1" | "libsvtav1", quality: number): string[] {
  // libaom-av1 and libsvtav1 both take a CRF from 0 (best/lossless) to 63 (worst)
  const args = ["-c:v", encoder, "-crf", String(Math.round(63 - (quality / 100) * 63))];
  // libsvtav1 rejects -still-picture
  if (encoder === "libaom-av1") args.push("-still-picture", "1");
  return args;
}

export type Av1VideoEncoder = "av1_nvenc" | "libsvtav1" | "libaom-av1";

export type NvencCapabilities = {
  h264: boolean;
  hevc: boolean;
  av1: boolean;
};

export function isNvencCodec(codec?: VideoCodec): codec is "h264-nvenc" | "hevc-nvenc" | "av1-nvenc" {
  return codec === "h264-nvenc" || codec === "hevc-nvenc" || codec === "av1-nvenc";
}

export function isCodecSupportedByNvenc(codec: VideoCodec, nvenc: NvencCapabilities | null): boolean {
  if (!isNvencCodec(codec)) return true;
  if (!nvenc) return false;
  if (codec === "h264-nvenc") return nvenc.h264;
  if (codec === "hevc-nvenc") return nvenc.hevc;
  return nvenc.av1;
}

const nvencCache = new Map<string, Promise<NvencCapabilities>>();

async function probeNvencEncoder(
  ffmpegPath: string,
  encoder: "h264_nvenc" | "hevc_nvenc" | "av1_nvenc",
): Promise<boolean> {
  try {
    await runProcess({
      command: ffmpegPath,
      args: [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=256x256:d=0.04",
        "-frames:v",
        "1",
        "-c:v",
        encoder,
        "-f",
        "null",
        "-",
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Probe whether this machine + FFmpeg build can actually run NVIDIA NVENC encoders.
 * Skipped immediately on macOS (no NVIDIA NVENC) and cached in memory per launch.
 */
export function getNvencCapabilities(ffmpegPath: string): Promise<NvencCapabilities> {
  if (process.platform === "darwin") {
    return Promise.resolve({ h264: false, hevc: false, av1: false });
  }
  let cached = nvencCache.get(ffmpegPath);
  if (!cached) {
    cached = (async () => {
      const encoders = await getAvailableEncoders(ffmpegPath);
      const hasH264 = !encoders || encoders.has("h264_nvenc");
      const hasHevc = !encoders || encoders.has("hevc_nvenc");
      const hasAv1 = !encoders || encoders.has("av1_nvenc");
      const [h264, hevc, av1] = await Promise.all([
        hasH264 ? probeNvencEncoder(ffmpegPath, "h264_nvenc") : Promise.resolve(false),
        hasHevc ? probeNvencEncoder(ffmpegPath, "hevc_nvenc") : Promise.resolve(false),
        hasAv1 ? probeNvencEncoder(ffmpegPath, "av1_nvenc") : Promise.resolve(false),
      ]);
      return { h264, hevc, av1 };
    })();
    nvencCache.set(ffmpegPath, cached);
  }
  return cached;
}

/**
 * Pick an AV1 video encoder matching the requested codec mode.
 * - "av1-nvenc": NVIDIA NVENC hardware AV1 (opt-in)
 * - "av1": CPU AV1 — prefers libsvtav1, falls back to libaom-av1
 */
export function pickAv1VideoEncoder(
  codec: Extract<VideoCodec, "av1" | "av1-nvenc">,
  encoders: Set<string> | null,
): Av1VideoEncoder | null {
  if (codec === "av1-nvenc") {
    return !encoders || encoders.has("av1_nvenc") ? "av1_nvenc" : null;
  }
  if (!encoders) return "libsvtav1";
  if (encoders.has("libsvtav1")) return "libsvtav1";
  if (encoders.has("libaom-av1")) return "libaom-av1";
  return null;
}

const NVENC_PRESET_MAP: Record<VideoPreset, string> = {
  ultrafast: "p1",
  superfast: "p2",
  veryfast: "p3",
  faster: "p4",
  fast: "p4",
  medium: "p5",
  slow: "p6",
  slower: "p7",
  veryslow: "p7",
};

const SVT_AV1_PRESET_MAP: Record<VideoPreset, string> = {
  ultrafast: "12",
  superfast: "10",
  veryfast: "9",
  faster: "8",
  fast: "7",
  medium: "6",
  slow: "5",
  slower: "4",
  veryslow: "3",
};

const AOM_CPU_USED_MAP: Record<VideoPreset, string> = {
  ultrafast: "8",
  superfast: "8",
  veryfast: "7",
  faster: "6",
  fast: "6",
  medium: "5",
  slow: "4",
  slower: "3",
  veryslow: "2",
};

export function mapPresetToNvenc(preset: VideoPreset): string {
  return NVENC_PRESET_MAP[preset] ?? "p5";
}

export function mapPresetToSvtAv1(preset: VideoPreset): string {
  return SVT_AV1_PRESET_MAP[preset] ?? "6";
}

export function mapPresetToAomCpuUsed(preset: VideoPreset): string {
  return AOM_CPU_USED_MAP[preset] ?? "5";
}

/** Map a 0-100 quality percentage to CRF/CQ on either a 0-51 (H.264/H.265/NVENC) or 0-63 (AV1/VP9) scale. */
export function qualityPercentToCrf(qualityPercentage: number, maxCrf: 51 | 63 = 51): number {
  const clamped = Math.max(0, Math.min(100, qualityPercentage));
  return Math.round(maxCrf - (clamped / 100) * maxCrf);
}

/** Format a human-readable CRF/CQ hint for the UI dropdown (e.g. "CRF 31" or "CQ 36"). */
export function formatQualityCrfHint(qualityPercentage: number, codec?: VideoCodec): string {
  if (isNvencCodec(codec)) {
    if (qualityPercentage >= 100) return "Lossless";
    const cq = Math.max(1, qualityPercentToCrf(qualityPercentage, 51));
    return `CQ ${cq}`;
  }
  if (codec === "av1") {
    return `CRF ${qualityPercentToCrf(qualityPercentage, 63)}`;
  }
  return `CRF ${qualityPercentToCrf(qualityPercentage, 51)}`;
}

export function missingEncoderError(format: string, encoder: string): Error {
  return new Error(
    `This FFmpeg build can't write ${format} because it has no ${encoder} encoder. ` +
      `Use a build that includes it (such as Homebrew's ffmpeg-full on macOS or a full GPL build on Windows) ` +
      `and set it as the Custom FFmpeg Path in the extension preferences.`,
  );
}
