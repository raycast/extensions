import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function dispatchElsewhereUrlInBackground(url: string): Promise<void> {
  await execFileAsync("/usr/bin/open", ["-g", url]);
}
