import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Run a short, read-only core command without exposing config contents from stderr. */
export async function runCoreCommand(
  pythonBin: string,
  args: string[],
  options: { cwd: string; signal?: AbortSignal; timeout?: number },
): Promise<string> {
  try {
    const { stdout } = await execFileAsync(pythonBin.trim(), args, {
      ...options,
      timeout: options.timeout ?? 30_000,
      maxBuffer: 8 * 1024 * 1024,
      encoding: "utf-8",
    });
    return stdout;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    const failure = error as NodeJS.ErrnoException & { killed?: boolean };
    if (failure.code === "ENOENT" || failure.code === "EACCES") {
      throw new Error("Cannot start Python. Check Config File Path and Python Executable in extension preferences.");
    }
    if (failure.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
      throw new Error("The library response is too large. Reduce Recent Papers Limit or use a more specific search.");
    }
    if (failure.killed) {
      throw new Error("Paper Agent took too long to respond. Retry, or check your Python environment and library.");
    }
    throw new Error("Paper Agent could not complete the command. Check your core installation and config.yaml.");
  }
}
