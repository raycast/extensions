import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getExecEnv } from "./env";

const execFileAsync = promisify(execFile);

type ExecCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  input?: string;
};

export async function runCommand(
  file: string,
  args: string[],
  options?: ExecCommandOptions,
): Promise<{ stdout: string; stderr: string }> {
  const commonOptions = {
    cwd: options?.cwd,
    env: getExecEnv(options?.env),
    timeout: options?.timeout ?? 120_000,
    maxBuffer: 10 * 1024 * 1024,
  };

  if (options?.input === undefined) {
    return execFileAsync(file, args, commonOptions);
  }

  // When input is provided, we need to pipe it to stdin manually because
  // the promisified execFile does not expose the child process's stdin.
  return new Promise((resolve, reject) => {
    const child = execFile(
      file,
      args,
      commonOptions,
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      },
    );

    if (child.stdin) {
      child.stdin.end(options.input);
    }
  });
}
