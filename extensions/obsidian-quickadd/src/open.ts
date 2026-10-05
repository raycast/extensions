import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Open a URI with macOS `open`; `background` keeps the target app behind the current one. */
export async function openUri(uri: string, background = false): Promise<void> {
  await execFileAsync("open", background ? ["-g", uri] : [uri]);
}
