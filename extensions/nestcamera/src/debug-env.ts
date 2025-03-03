import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { environment } from "@raycast/api";

export function logEnvironment() {
  try {
    const logPath = join(homedir(), "raycast-env-debug.log");
    const envData = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      SHELL: process.env.SHELL,
      environment: environment,
      cwd: process.cwd(),
    };

    writeFileSync(logPath, JSON.stringify(envData, null, 2));
    console.log(`Environment logged to ${logPath}`);
    return `Environment logged to ${logPath}`;
  } catch (error) {
    console.error("Error logging environment:", error);
    return `Error: ${error}`;
  }
}
