import { execFile } from "child_process";
import { promisify } from "util";
import { getProfileDir } from "./chrome-paths";
import { shellQuoteArg } from "./shell-quote";

const execFileAsync = promisify(execFile);

const OPEN = "/usr/bin/open";
const CHROME_APP_NAME = "Google Chrome";
/** Passed after --profile-directory to force Chrome to actually spawn a fresh
 * window (opening on the current Space) rather than focusing an existing one. */
const NEW_TAB_URL = "chrome://newtab";

/**
 * Launch the given profile in a NEW Chrome application instance. The `-n` flag
 * is essential: it starts a new instance so the window opens on the current
 * macOS Space instead of switching to an existing profile window elsewhere.
 * `--new-window <url>` forces a real new window rather than a focus of an
 * existing one. Uses an argument array (no shell) — nothing to escape or inject.
 */
export async function launchProfile(directory: string): Promise<void> {
  await execFileAsync(OPEN, [
    "-n",
    "-a",
    CHROME_APP_NAME,
    "--args",
    `--profile-directory=${directory}`,
    "--new-window",
    NEW_TAB_URL,
  ]);
}

/** Launch the given profile in a new incognito window. */
export async function launchIncognito(directory: string): Promise<void> {
  await execFileAsync(OPEN, [
    "-n",
    "-a",
    CHROME_APP_NAME,
    "--args",
    `--profile-directory=${directory}`,
    "--incognito",
    "--new-window",
    NEW_TAB_URL,
  ]);
}

/** Reveal the profile's directory in Finder. */
export async function revealProfileFolder(directory: string): Promise<void> {
  await execFileAsync(OPEN, [getProfileDir(directory)]);
}

/** Build a safely-quoted, copy-pasteable version of the launch command. */
export function buildLaunchCommand(directory: string): string {
  return `open -na "${CHROME_APP_NAME}" --args --profile-directory=${shellQuoteArg(directory)} --new-window ${shellQuoteArg(NEW_TAB_URL)}`;
}
