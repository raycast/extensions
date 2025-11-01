import { ExecException, ExecOptions, exec } from "child_process";

interface ExecResult {
  stdout: string;
  stderr: string;
}

export function execPromise(command: string, options?: ExecOptions): Promise<ExecResult> {
  return new Promise<ExecResult>((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout as string;
        error.stderr = stderr as string;
        reject(error);
      } else {
        resolve({ stdout, stderr } as ExecResult);
      }
    });
  });
}

export function isExecException(error: unknown): error is ExecException {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    "message" in error &&
    ("cmd" in error ||
      "killed" in error ||
      "code" in error ||
      "signal" in error ||
      "stdout" in error ||
      "stderr" in error)
  );
}

export const COMMAND_NOT_FOUND_CODE = 127;
