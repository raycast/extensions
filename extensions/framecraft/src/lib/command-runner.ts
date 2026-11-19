import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execute = promisify(execFile);
let cancellationCheck: (() => boolean) | undefined;
export function setCancellationCheck(check?: () => boolean): void {
  cancellationCheck = check;
}
export function isCancellationRequested(): boolean {
  return !!cancellationCheck?.();
}

/** A command that outlives its deadline is terminated, not merely reported.
 * Report-only deadlines left the child running: a stuck ffmpeg kept the task
 * "in progress" indefinitely and the queue slot stayed occupied.
 */
export async function runCommand(
  file: string,
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv;
    timeout?: number;
    maxBuffer?: number;
    onStderrLine?: (line: string) => void;
  } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = 0, onStderrLine, ...rest } = options;
  let commandRef: ReturnType<typeof execute> | undefined;
  let killedByDeadline = false;
  const timer =
    timeout > 0
      ? setTimeout(() => {
          killedByDeadline = true;
          commandRef?.child.kill("SIGKILL");
        }, timeout)
      : undefined;
  try {
    if (cancellationCheck?.()) throw new Error("Task stopped manually");
    const command = execute(file, args, { ...rest, encoding: "utf8", timeout: 0 });
    commandRef = command;
    if (onStderrLine && command.child.stderr) {
      let pending = "";
      command.child.stderr.on("data", (chunk) => {
        pending += chunk.toString();
        const lines = pending.split("\n");
        pending = lines.pop() || "";
        for (const line of lines) onStderrLine(line);
      });
    }
    const poll = setInterval(() => {
      if (cancellationCheck?.()) command.child.kill("SIGKILL");
    }, 250);
    try {
      const result = await command;
      if (cancellationCheck?.()) throw new Error("Task stopped manually");
      return result;
    } catch (error) {
      if (cancellationCheck?.()) throw new Error("Task stopped manually");
      if (killedByDeadline)
        throw new Error(
          `Step timed out after ${Math.round(timeout / 1000)} seconds and was stopped so the task wouldn't hang.`,
        );
      throw error;
    } finally {
      clearInterval(poll);
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}
