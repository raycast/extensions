import { spawnSync } from "child_process";

/**
 * Promisified spawn function
 */
export function spawn(command: string, args: ReadonlyArray<string>) {
  return new Promise((resolve, reject) => {
    const process = spawnSync(command, args);
    if (process.error !== undefined) {
      reject(process.error);
    } else {
      resolve(process.stdout.toString());
    }
  });
}
