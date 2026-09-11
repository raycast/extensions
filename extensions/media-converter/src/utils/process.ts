import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFilePromise = promisify(execFile);

export type ProcessSpec = {
  command: string;
  args: string[];
};

export type ProcessResult = {
  stdout: string;
  stderr: string;
};

export async function runProcess(spec: ProcessSpec, signal?: AbortSignal): Promise<ProcessResult> {
  const result = await execFilePromise(spec.command, spec.args, {
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
    signal,
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

function quoteForDisplay(value: string): string {
  if (value.length > 0 && /^[A-Za-z0-9_./:=+,%@-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Produces a copyable shell command for history/preview only.
 * Execution always uses the unambiguous command + args representation above.
 */
export function formatProcessForDisplay(spec: ProcessSpec): string {
  return [spec.command, ...spec.args].map(quoteForDisplay).join(" ");
}
