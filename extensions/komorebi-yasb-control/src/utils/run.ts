import { spawn, ChildProcess } from "child_process";

export function run(
  command: string,
  args: string[] = [],
  onError?: (error: Error) => void,
  useShell = false,
): ChildProcess {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    shell: useShell,
  });

  child.on("error", (error) => {
    if (onError) {
      onError(error);
    } else {
      console.error(`Failed to start ${command}:`, error);
    }
  });

  child.unref();
  return child;
}
