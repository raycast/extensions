import { execFile } from "child_process";

export function exec(
  command: string,
  args: string[],
  timeout = 10000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout, encoding: "utf-8" },
      (error, stdout, stderr) => {
        if (error) {
          reject(Object.assign(error, { stderr }));
          return;
        }
        resolve(stdout);
      },
    );
  });
}
