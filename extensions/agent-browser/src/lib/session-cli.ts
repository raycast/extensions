import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Strict JSON only. Never surface raw CLI output, which may include credentials or page content. */
export async function executeSessionCLI(
  executable: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  signal: AbortSignal,
  timeout = 15_000,
): Promise<unknown> {
  signal.throwIfAborted();
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(executable, ["--json", ...args], {
      encoding: "utf8",
      env,
      signal,
      timeout,
      maxBuffer: 100_000,
      windowsHide: true,
    }));
  } catch (error) {
    signal.throwIfAborted();
    const failure = error as { code?: string; killed?: boolean };
    if (failure.code === "ENOENT")
      throw new Error("Agent Browser executable was not found. Check extension preferences.");
    if (failure.killed) throw new Error("Agent Browser timed out. Refresh to check the session before retrying.");
    throw new Error("Agent Browser failed. Check the CLI installation and refresh before retrying.");
  }
  signal.throwIfAborted();
  try {
    const result: unknown = JSON.parse(stdout);
    if (!result || typeof result !== "object" || !("success" in result) || result.success !== true) throw new Error();
    return result;
  } catch {
    throw new Error("Agent Browser returned an unsuccessful or unsupported JSON response. Update the CLI and refresh.");
  }
}
