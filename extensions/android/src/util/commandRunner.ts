import { exec, spawn } from "child_process";

/**
 * The single seam through which the extension executes external commands.
 * Production uses {@link defaultCommandRunner}; tests inject a fake.
 */
export interface CommandRunner {
  exec(cmd: string): Promise<string>;
  spawn(
    cmd: string,
    output: ((out: string) => void) | undefined,
    error: ((error: string) => void) | undefined
  ): void;
}

export const defaultCommandRunner: CommandRunner = {
  exec(cmd: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      exec(cmd, (err: any, stdout: string) => {
        if (err != null) {
          reject(err);
          return;
        }
        resolve(stdout);
      });
    });
  },

  spawn(
    cmd: string,
    output: ((out: string) => void) | undefined,
    error: ((error: string) => void) | undefined
  ): void {
    const childProcess = spawn(cmd, [], { shell: true });

    childProcess.stdout.on("data", function (data: string) {
      if (output) {
        output(data.toString());
      }
      console.log("stdout: " + data);
    });

    childProcess.stderr.on("data", function (data: string) {
      console.log("stderr: " + data);
      if (error) {
        error(data.toString());
      }
    });
  },
};

export async function executeAsync(
  cmd: string,
  runner: CommandRunner = defaultCommandRunner
): Promise<string> {
  return runner.exec(cmd);
}

export function runCommand(
  cmd: string,
  output: ((out: string) => void) | undefined,
  error: ((error: string) => void) | undefined,
  runner: CommandRunner = defaultCommandRunner
) {
  runner.spawn(cmd, output, error);
}
