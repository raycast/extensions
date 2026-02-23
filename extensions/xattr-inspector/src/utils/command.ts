import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

interface RunCommandOptions {
  trim?: boolean;
  encoding?: BufferEncoding | "buffer";
}

const TIMEOUT_MS = 15_000;

export async function runCommand(
  command: string,
  args: string[],
  { trim = true, encoding = "utf8" }: RunCommandOptions = {},
): Promise<string | Buffer> {
  if (encoding === "buffer") {
    const { stdout } = await execFileAsync(command, args, {
      encoding: "buffer",
      maxBuffer: 10 * 1024 * 1024,
      timeout: TIMEOUT_MS,
    });
    return stdout as Buffer;
  }

  const { stdout } = await execFileAsync(command, args, {
    encoding,
    maxBuffer: 10 * 1024 * 1024,
    timeout: TIMEOUT_MS,
  });

  const text = stdout as string;
  return trim ? text.trim() : text;
}
