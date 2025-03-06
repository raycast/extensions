import { executeFFmpegCommand, executeFFprobeCommand } from "./execute";

export function writeMetadata({ filePath, key, value }: { filePath: string; key: string; value: string }) {
  executeFFmpegCommand(`-i ${filePath} -metadata ${key}="${value}" ${filePath.replace(/\.mp4$/gi, "_new.mp4")}`);
}

export function readMetadata({ filePath, key }: { filePath: string; key: string }) {
  executeFFprobeCommand(
    `ffprobe -v quiet -show_entries format_tags=${key} -of default=noprint_wrappers=1:nokey=1 ${filePath}`
  );
}
