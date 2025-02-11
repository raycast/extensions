import { exec } from "node:child_process";

export const execPromise = (command: string) =>
  new Promise<string | null | undefined>((resolve) => {
    exec(command, (err, stdout, stderr) => {
      if (err || stderr) {
        resolve(undefined);
        return;
      }
      resolve(stdout?.trim() || null);
    });
  });
