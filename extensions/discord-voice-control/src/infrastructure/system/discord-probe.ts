import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";

/**
 * Objective, content-free probes for Discord presence. These never read Discord account, server,
 * or channel data — only process/installation facts the extension needs to decide availability.
 *
 * MVP targets Discord Stable (bundle id `com.hnc.Discord`); PTB/Canary are out of scope.
 */

export const DISCORD_BUNDLE_ID = "com.hnc.Discord";
export const DISCORD_APP_NAME = "Discord";
const DISCORD_DEFAULT_PATH = "/Applications/Discord.app";

function run(file: string, args: readonly string[], timeoutMs = 3000): Promise<{ code: number }> {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: timeoutMs }, (error) => {
      // execFile yields a non-null error when exit code != 0; we only need the boolean signal.
      const code = error && typeof error.code === "number" ? error.code : error ? 1 : 0;
      resolve({ code });
    });
  });
}

/** True if a Discord process is currently running. */
export async function isDiscordRunning(): Promise<boolean> {
  const byName = await run("/usr/bin/pgrep", ["-x", DISCORD_APP_NAME]);
  if (byName.code === 0) {
    return true;
  }
  const byPath = await run("/usr/bin/pgrep", ["-f", "Discord.app/Contents/MacOS/Discord"]);
  return byPath.code === 0;
}

/**
 * Best-effort detection of whether Discord is installed. Checks the default install path first
 * (cheap), then falls back to a bundle-id Spotlight lookup. A negative result is advisory — some
 * users install to non-standard locations with Spotlight disabled — so callers should treat
 * "not installed" as informational, not a hard block, when Discord is detected running.
 */
export async function isDiscordInstalled(): Promise<boolean> {
  try {
    await access(DISCORD_DEFAULT_PATH, constants.F_OK);
    return true;
  } catch {
    // fall through to Spotlight lookup
  }
  return new Promise((resolve) => {
    execFile(
      "/usr/bin/mdfind",
      [`kMDItemCFBundleIdentifier == '${DISCORD_BUNDLE_ID}'`],
      { timeout: 3000 },
      (error, stdout) => {
        if (error) {
          resolve(false);
          return;
        }
        resolve((stdout ?? "").trim().length > 0);
      },
    );
  });
}
