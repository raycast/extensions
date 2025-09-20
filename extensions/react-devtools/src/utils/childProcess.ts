import { spawn } from "node:child_process";

export * from "node:child_process";

export function spawnPlus(command: SpawnArgs[0], options?: SpawnArgs[2]) {
  let stderr = "";
  const newOptions = { shell: true, ...options };
  const child = spawn(command, newOptions);
  child.stderr?.on("data", (data) => {
    stderr += data;
  });
  child.on("exit", (exitCode) => {
    if (exitCode !== 0) {
      child.emit("errorPlus", { exitCode, stderr: stderr.trim() });
    }
  });
  return child;
}

type SpawnArgs = Parameters<typeof spawn>;
