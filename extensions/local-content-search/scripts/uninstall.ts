import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { AGENT_LABEL } from "./agent";

// Unregister only this service; retain the index and models instead of deleting user state.
async function main(): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("Requires macOS");
  }
  const exec = promisify(execFile);
  await exec("/bin/launchctl", [
    "bootout",
    `gui/${process.getuid!()}/${AGENT_LABEL}`,
  ]).catch(() => {});
  const plist = join(homedir(), "Library/LaunchAgents", `${AGENT_LABEL}.plist`);
  await rename(plist, `${plist}.disabled`).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    },
  );
  console.log(
    "Login service disabled. Index, models, settings, and binaries retained.",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
