import { execFile } from "node:child_process";

/** Raycast runs commands with a minimal PATH; add the usual tool folders. */
const PATH = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH ?? ""].join(":");

/** Runs a command and returns trimmed stdout (rejects on a non-zero exit). */
export function run(
  command: string,
  args: string[],
  options: { cwd?: string; timeout?: number } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeout ?? 15_000,
        env: { ...process.env, PATH },
        maxBuffer: 8 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) reject(new Error((stderr || error.message).trim()));
        else resolve(stdout.trim());
      },
    );
  });
}
