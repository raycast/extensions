import { FileType } from "../../type/file";
import { executeFFmpegCommand } from "./execute";

export function getFileType(filePath: string): { type: FileType; hasVideoStream: boolean; hasAudioStream: boolean } {
  try {
    const commandForCheckVideo = `ffmpeg -i ${JSON.stringify(
      filePath
    )} -f null - 2>&1 | grep -q Video && echo 1 || echo 0`;
    const commandForCheckAudio = `ffmpeg -i ${JSON.stringify(
      filePath
    )} -f null - 2>&1 | grep -q Audio && echo 1 || echo 0 || echo 0`;
    const hasVideoStream = executeFFmpegCommand(commandForCheckVideo).trim() === "1";
    const hasAudioStream = executeFFmpegCommand(commandForCheckAudio).trim() === "1";

    if (hasVideoStream) {
      return { type: FileType.video, hasVideoStream, hasAudioStream };
    }
    if (hasAudioStream) {
      return { type: FileType.audio, hasVideoStream, hasAudioStream };
    }
  } catch (e) {
    console.error(e);
  }
  return { type: FileType.other, hasVideoStream: false, hasAudioStream: false };
}
