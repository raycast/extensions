import { runProcess } from "./process";

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

export function missingEncoderError(format: string, encoder: string): Error {
  return new Error(
    `This FFmpeg build can't write ${format} because it has no ${encoder} encoder. ` +
      `Use a build that includes it, such as Homebrew's ffmpeg-full (/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg), ` +
      `and set it as the Custom FFmpeg Path in the extension preferences.`,
  );
}
