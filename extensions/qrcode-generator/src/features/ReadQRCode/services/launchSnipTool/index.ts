import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

export async function launchSnipTool(): Promise<void> {
  await run("cmd.exe", ["/c", "start", "", "ms-screenclip:"]);
}
