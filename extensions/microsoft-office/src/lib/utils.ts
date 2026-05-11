import { spawn } from "child_process";

export function runExecutable(executable: string, args: string[]) {
  const child = spawn(executable, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}
