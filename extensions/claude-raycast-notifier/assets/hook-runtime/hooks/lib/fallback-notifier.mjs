import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function showMacNotification(title, message) {
  const script = `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`;
  await execFileAsync("osascript", ["-e", script]);
}
