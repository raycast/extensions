import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Run a binary with positional arguments. Never goes through a shell, so region
 * names and other values can't be interpreted as shell syntax.
 */
export async function run(
  bin: string,
  args: string[],
  opts: { timeout?: number } = {},
): Promise<string> {
  const { stdout } = await execFileAsync(bin, args, {
    timeout: opts.timeout ?? 10_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout.toString().trim();
}
