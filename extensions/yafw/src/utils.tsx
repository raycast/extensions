import { Toast, showToast } from "@raycast/api";
import { exec, execSync } from "child_process";
import fs, { existsSync } from "fs";
import { promisify } from "util";
import { COMPRESSION_OPTIONS, CompressionOptionKey, FFMPEG_BINARY_CUSTOM_PATH, PATH, VIDEO_FORMATS } from "./constants";

const ffmpegPathExists = (): boolean => {
  try {
    return existsSync(FFMPEG_BINARY_CUSTOM_PATH);
  } catch (error) {
    return false;
  }
};

const isFFmpegInstalledOnPath = (): boolean => {
  try {
    const result = execSync(`zsh -l -c 'PATH=${PATH} ffmpeg -version'`).toString();
    if (result.includes("ffmpeg version")) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

export function normalizeFilePath(filePath: string): string {
  return filePath.replace(/^file:\/\//, "").replace(/%20/g, " ");
}

export function fileName(filePath: string): string {
  return filePath.split("/").pop()!;
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function fileExists(file: string) {
  return fs.existsSync(file);
}

const getFFmpegCommand = (args: string) => {
  const isInPath = isFFmpegInstalledOnPath();
  const customPathExists = ffmpegPathExists();

  if (isInPath) {
    return `zsh -l -c 'PATH=${PATH} ffmpeg ${args}'`;
  } else if (customPathExists) {
    return `${FFMPEG_BINARY_CUSTOM_PATH} ${args}`;
  } else {
    showToast({
      title: "Error",
      message: "FFmpeg is not installed. Please install FFmpeg or specify its path in the extension settings.",
      style: Toast.Style.Failure,
    });
    return null;
  }
};

export function sanitizeFileName(file: string): string {
  return file
    .replace(/\\/g, "\\\\")
    .replace(/ /g, "\\ ")
    .replace(/`/g, "\\`")
    .replace(/"/g, `\\"`)
    .replace(/\$/g, `\\$`)
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export async function compressVideoFiles(files: string[], compression: CompressionOptionKey): Promise<string[]> {
  const one = files.length === 1;
  await showToast(Toast.Style.Animated, one ? "Compressing video..." : "Compressing videos...");

  const results = await Promise.all(
    files.map(async (file) => {
      const output = file.replace(/\.\w+$/, ` (yafw ${compression}).mp4`);
      const { crf, bitrate, bufsize } = COMPRESSION_OPTIONS[compression];
      const command = getFFmpegCommand(
        `-y -i ${sanitizeFileName(file)} -vcodec libx264 -crf ${crf} -b:v ${bitrate} -bufsize ${bufsize} ${sanitizeFileName(output)}`,
      );

      if (!command) {
        return [];
      }

      return promisify(exec)(command).then(({ stdout, stderr }) => {
        console.log(stdout);
        console.log(stderr);
        return output;
      });
    }),
  );

  const successfulFiles = results.filter(Boolean) as string[];

  if (successfulFiles.length !== files.length) {
    showToast({
      title: "Error",
      message: "Some files could not be compressed.",
      style: Toast.Style.Failure,
    });
  } else {
    showToast({
      title: "Success",
      message: `Successfully compressed all files.`,
      style: Toast.Style.Success,
    });
  }

  return successfulFiles;
}

export function capitalizeSnakeCase(text: string): string {
  return text
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isFileFormatSupported(_filename: string): boolean {
  const filename = _filename.toLowerCase();
  return VIDEO_FORMATS.some((format) => filename.endsWith(format));
}
