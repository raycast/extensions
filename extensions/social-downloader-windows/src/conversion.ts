import { randomUUID } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { run } from "./process";
import type { Tools } from "./tools";

export interface Conversion {
  format: "mp4" | "mkv" | "mp3" | "m4a" | "wav";
  height: number;
  bitrate: string;
}
export function conversionArgs(
  input: string,
  output: string,
  options: Conversion,
): string[] {
  if (
    !Number.isInteger(options.height) ||
    options.height < 0 ||
    !["128", "192", "256", "320"].includes(options.bitrate)
  )
    throw new Error("Invalid conversion quality.");
  const args = ["-hide_banner", "-nostdin", "-n", "-i", input];
  if (["mp3", "m4a", "wav"].includes(options.format)) {
    args.push(
      "-vn",
      "-map",
      "0:a:0",
      "-c:a",
      options.format === "mp3"
        ? "libmp3lame"
        : options.format === "m4a"
          ? "aac"
          : "pcm_s16le",
    );
    if (options.format !== "wav") args.push("-b:a", `${options.bitrate}k`);
  } else {
    args.push(
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      `${options.bitrate}k`,
    );
    args.push(
      "-vf",
      options.height
        ? `scale=-2:trunc(min(${options.height}\\,ih)/2)*2`
        : "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    );
    if (options.format === "mp4") args.push("-movflags", "+faststart");
  }
  return [...args, "-progress", "pipe:1", "-nostats", output];
}

export async function convert(
  input: string,
  destination: string,
  options: Conversion,
  tools: Tools,
  signal: AbortSignal,
  progress: (percent: number) => void,
): Promise<string> {
  if (!(await stat(input)).isFile()) throw new Error("Select a media file.");
  const probe = JSON.parse(
    await run(
      tools.ffprobe,
      ["-v", "error", "-show_format", "-show_streams", "-of", "json", input],
      { signal, timeout: 30000 },
    ),
  );
  const audio = ["mp3", "m4a", "wav"].includes(options.format);
  if (
    !probe.streams?.some(
      (stream: { codec_type?: string }) =>
        stream.codec_type === (audio ? "audio" : "video"),
    )
  )
    throw new Error(
      audio
        ? "The file does not contain audio."
        : "The file does not contain video.",
    );
  await mkdir(destination, { recursive: true });
  const name = basename(input, extname(input)).slice(0, 100);
  const output = join(
    destination,
    `${name}-converted-${randomUUID().slice(0, 8)}.${options.format}`,
  );
  const duration = Number(probe.format?.duration);
  await run(tools.ffmpeg, conversionArgs(input, output, options), {
    signal,
    onLine: (line) => {
      if (line.startsWith("out_time_us=") && duration > 0)
        progress(Math.min(100, Number(line.slice(12)) / 10000 / duration));
    },
  });
  if (!(await stat(output)).size)
    throw new Error("The converted file is empty.");
  return output;
}
