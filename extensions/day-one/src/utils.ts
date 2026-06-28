import child_process from "child_process";
import { promisify } from "util";

const execAsync = promisify(child_process.exec);

const commandPath = [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"]
  .filter(Boolean)
  .join(":");

export const exec = (command: string) => execAsync(command, { env: { ...process.env, PATH: commandPath } });
