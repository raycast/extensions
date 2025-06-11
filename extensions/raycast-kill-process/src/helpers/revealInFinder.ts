import { exec } from "child_process";

export const revealInFinder = async (path: string): Promise<void> =>
  new Promise((resolve, reject) => {
    exec(`open -R '${path}'`, (err) => {
      if (err != null) return reject(err);

      resolve();
    });
  });
