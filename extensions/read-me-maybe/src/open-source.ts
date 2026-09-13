import { spawn } from "node:child_process";

export function runOpenCommand(command: string): void {
  if (command.trim() === "") return;

  const process = spawn(command, {
    detached: true,
    shell: "/bin/sh",
    stdio: "ignore",
  });
  process.on("error", () => undefined);
  process.unref();
}
