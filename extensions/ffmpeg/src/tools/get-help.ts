type Input = {
  /**
   * Which program to get help for
   */
  program: "ffmpeg" | "ffprobe";
};

import { executeFFmpegCommandAsync, executeFFprobeCommandAsync } from "../utils/ffmpeg";
export default async function ({ program }: Input) {
  let output = "";
  const execute = program === "ffmpeg" ? executeFFmpegCommandAsync : executeFFprobeCommandAsync;
  const code = await execute({ command: "-h long", onContent: (content) => (output += content) });
  if (code === 0) {
    return { output };
  }
  return { output: `Failed to get help, exit code: ${code}` };
}
