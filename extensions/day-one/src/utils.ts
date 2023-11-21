import childProcess from "node:child_process";

export async function exec(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, (error, stdout, stderr) => {
      if (error !== null) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}
