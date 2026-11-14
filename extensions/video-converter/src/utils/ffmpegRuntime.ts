import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import type { Preset, VideoCodec } from "../types";

const execFileAsync = promisify(execFile);

export function findExecutable(
  name: string,
  platform = process.platform,
  env = process.env,
  isFile = executableFile,
  extra: string[] = [],
) {
  const paths = platform === "win32" ? path.win32 : path.posix;
  const suffix = platform === "win32" ? ".exe" : "";
  const variable = (name: string) => Object.entries(env).find(([key]) => key.toUpperCase() === name)?.[1];
  const directories = (variable("PATH") || "")
    .split(platform === "win32" ? ";" : ":")
    .map((p) => p.replace(/^"|"$/g, ""))
    .filter((p) => paths.isAbsolute(p));
  if (platform === "win32") {
    const local = variable("LOCALAPPDATA");
    const programData = variable("PROGRAMDATA");
    if (local) directories.push(paths.join(local, "Microsoft", "WinGet", "Links"));
    if (programData) directories.push(paths.join(programData, "chocolatey", "bin"));
  } else {
    directories.push("/opt/homebrew/bin", "/usr/local/bin", "/usr/bin");
  }
  const override = variable(`${name.toUpperCase()}_PATH`);
  const candidates = [
    override,
    ...extra.map((dir) => paths.join(dir, name + suffix)),
    ...directories.map((dir) => paths.join(dir, name + suffix)),
  ];
  return candidates.find(
    (candidate): candidate is string => !!candidate && paths.isAbsolute(candidate) && isFile(candidate),
  );
}

export function findFFmpegTools(platform = process.platform, env = process.env, isFile = executableFile) {
  const paths = platform === "win32" ? path.win32 : path.posix;
  const ffmpeg = findExecutable("ffmpeg", platform, env, isFile);
  const ffprobe = findExecutable("ffprobe", platform, env, isFile, ffmpeg ? [paths.dirname(ffmpeg)] : []);
  return ffmpeg && ffprobe ? { ffmpeg, ffprobe } : undefined;
}

function executableFile(file: string): boolean {
  try {
    fs.accessSync(file, process.platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

const softwareEncoders: Record<VideoCodec, string> = {
  h264: "libx264",
  h265: "libx265",
  mpeg4: "mpeg4",
  vp8: "libvpx",
  vp9: "libvpx-vp9",
  mpeg1: "mpeg1video",
  mpeg2: "mpeg2video",
};

export function hardwareCandidates(codec: VideoCodec, platform = process.platform): string[] {
  if (codec !== "h264" && codec !== "h265") return [];
  const prefix = codec === "h265" ? "hevc" : "h264";
  if (platform === "darwin") return [`${prefix}_videotoolbox`];
  if (platform === "win32") return [`${prefix}_nvenc`, `${prefix}_qsv`, `${prefix}_amf`];
  return [];
}

// x264/x265 presets are not portable to VideoToolbox, AMF, NVENC or VPx.
export function encoderOptions(encoder: string, preset: Preset): string[] {
  return encoder === "libx264" || encoder === "libx265" ? [`-preset ${preset}`] : [];
}

export async function selectVideoEncoder(
  codec: VideoCodec,
  hardware: boolean,
  available: Set<string>,
  probe: (encoder: string) => Promise<boolean>,
  platform = process.platform,
): Promise<string> {
  if (hardware) {
    for (const encoder of hardwareCandidates(codec, platform)) {
      if (available.has(encoder) && (await probe(encoder))) return encoder;
    }
  }
  const encoder = softwareEncoders[codec];
  if (!available.has(encoder))
    throw new Error(`FFmpeg is missing ${encoder}. Install a full FFmpeg build (see the README).`);
  return encoder;
}

export async function probeHardwareEncoder(binary: string, encoder: string): Promise<boolean> {
  try {
    await execFileAsync(
      binary,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=size=128x128:rate=30",
        "-frames:v",
        "1",
        "-an",
        "-c:v",
        encoder,
        "-pix_fmt",
        "yuv420p",
        "-f",
        "null",
        "-",
      ],
      { windowsHide: true, timeout: 10000 },
    );
    return true;
  } catch {
    // A compiled-in encoder may still have no usable GPU or driver.
    return false;
  }
}
