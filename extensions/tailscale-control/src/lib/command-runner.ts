import { execFile } from "node:child_process";

import { TailscaleBinaryNotFoundError, TailscaleCommandError } from "./errors";

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export async function runExecFile(command: string, args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ stdout, stderr });
        return;
      }

      const code = typeof error.code === "number" ? error.code : null;
      const errorCode = typeof error.code === "string" ? error.code : null;

      if (errorCode === "ENOENT") {
        reject(new TailscaleBinaryNotFoundError(command));
        return;
      }

      reject(
        new TailscaleCommandError(
          error.message,
          command,
          args,
          code,
          typeof stdout === "string" ? stdout : "",
          typeof stderr === "string" ? stderr : "",
        ),
      );
    });
  });
}
