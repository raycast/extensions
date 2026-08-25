import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Never goes through a shell, so arguments can't be interpreted as shell syntax. */
export async function run(bin: string, args: string[], opts: { timeout?: number } = {}): Promise<string> {
  const { stdout } = await execFileAsync(bin, args, {
    timeout: opts.timeout ?? 10_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout.toString().trim();
}
