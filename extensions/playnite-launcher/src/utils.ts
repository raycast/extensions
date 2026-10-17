import { exec } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";

export const removeBOM = (source: string) => source.replace(/^\uFEFF/, "");

export const execAsync = (command: string) => {
  const env = {
    ...process.env,
    // APPDATA is not directly available in child processes spawned from Raycast but Playnite needs it if it's a cold start
    APPDATA: join(homedir(), "AppData", "Roaming"),
  };

  return promisify(exec)(command, { env });
};
