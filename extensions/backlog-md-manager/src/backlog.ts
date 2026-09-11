import { execFile } from "child_process";
import { promisify } from "util";
import { getProjectConfig } from "./preferences";

const execFileAsync = promisify(execFile);

export async function runBacklog(args: string[], cwd: string): Promise<string> {
  const { backlogPath } = getProjectConfig();

  const { stdout } = await execFileAsync(backlogPath, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: "0" },
    timeout: 15000,
  });

  return stdout;
}
