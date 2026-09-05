import { spawn } from "node:child_process";
import type { ExecFn } from "./launch-executor";

export const raycastExec: ExecFn = async (command, args) => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      shell: false,
      windowsHide: false,
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
};
