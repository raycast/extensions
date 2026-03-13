import { execFile } from "node:child_process";

export const execPromise = (command: string, args: string[] = []) =>
  new Promise<string | null | undefined>((resolve) => {
    execFile(command, args, (err, stdout, stderr) => {
      if (err || stderr) {
        resolve(undefined);
        return;
      }
      resolve(stdout?.trim() || null);
    });
  });
