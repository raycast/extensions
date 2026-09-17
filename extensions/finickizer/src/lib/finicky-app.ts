import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Finicky resolves ~/.finicky.js once at startup and watches that resolved file, so it has to be
 * restarted after the link is swapped. Reopened in the background; a no-op if it was not running.
 */
export async function restartFinicky(): Promise<void> {
  await run("/usr/bin/killall", ["Finicky"]).catch(() => undefined);
  await new Promise((done) => setTimeout(done, 500));
  await run("/usr/bin/open", ["-g", "-b", "se.johnste.finicky"]);
}
