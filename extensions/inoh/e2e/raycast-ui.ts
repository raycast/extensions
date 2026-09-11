/**
 * Driving the Raycast UI blindly, and safely.
 *
 * Raycast is a closed-source native app: no browser, no CDP, and its window is
 * absent from the macOS accessibility tree (`System Events` reports zero
 * windows for the process). So its UI can be *typed into* but never *read*.
 *
 * That shapes the whole approach: input goes in through keystrokes, and every
 * assertion is made against the database afterwards — which is a stronger claim
 * than "the screenshot looked right" anyway. What stays unverified is pixels,
 * and that is what the manual checklist is for.
 *
 * Three interlocks, because blind keystrokes on a developer's own machine
 * deserve them:
 *
 *   1. Opt-in. Nothing runs unless `INOH_RAYCAST_UI=1`.
 *   2. Focus. Keys are only ever sent while Raycast is genuinely frontmost, so
 *      a word can never be typed into your editor.
 *   3. A local-only probe word. The word under test exists only in the local
 *      dictionary, so an extension secretly pointed at production cannot find
 *      it — and therefore cannot add anything to a live account.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const LOCAL_CONFIG_PATH = path.resolve(process.cwd(), "assets/local-config.json");
const MANIFEST_PATH = path.resolve(process.cwd(), "package.json");
const RAYCAST_APP_NAME = "Raycast";
const FOCUS_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 250;
/** macOS virtual key codes; the numbers are the only thing naming the keys. */
const RETURN_KEY_CODE = 36;
const ESCAPE_KEY_CODE = 53;
/** Raycast takes focus before the command's first render finishes. */
const COMMAND_RENDER_SETTLE_MS = 1_200;
/** Search is debounced and then hits the network. */
const SEARCH_SETTLE_MS = 3_000;
/** An action round-trips to Supabase before the deck reflects it. */
const ACTION_SETTLE_MS = 3_000;

const _sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const _runAppleScript = (script: string): string =>
  execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim();

/** Whether the suite is allowed to drive the real Raycast UI. */
export const isRaycastUiEnabled = (): boolean => process.env.INOH_RAYCAST_UI === "1";

/** Reads the name of the app currently in front. */
const _readFrontmostAppName = (): string =>
  _runAppleScript('tell application "System Events" to return name of first process whose frontmost is true');

/**
 * Refuses to run unless the extension under test is the locally developed one,
 * pointed at the local stack.
 *
 * @throws When the dev build is not running, or is not configured for local
 */
export function assertLocalDevExtension(): void {
  _assertLocalConfigPointsAtLoopback();
  _assertDevServerRunning();
}

/** The extension only reads this file in development, and only for local runs. */
function _assertLocalConfigPointsAtLoopback(): void {
  if (!existsSync(LOCAL_CONFIG_PATH)) {
    throw new Error(
      `${LOCAL_CONFIG_PATH} is missing, so the extension would talk to production. ` +
        "Create it with the local Supabase URL and key, then run `npm run dev`.",
    );
  }
  const configFileText = readFileSync(LOCAL_CONFIG_PATH, "utf8");
  const isPointingAtLoopback = /127\.0\.0\.1|localhost/.test(configFileText);
  if (!isPointingAtLoopback) {
    throw new Error(`${LOCAL_CONFIG_PATH} does not point at a loopback address. Refusing to drive the UI.`);
  }
}

/** Raycast loads the local build, and reads local-config.json, only in development mode. */
function _assertDevServerRunning(): void {
  try {
    execFileSync("pgrep", ["-f", "ray develop"], { stdio: "ignore" });
  } catch {
    throw new Error("No `ray develop` process found. Start it with `npm run dev`.");
  }
}

/**
 * Builds the deeplink Raycast answers for one of this extension's commands.
 *
 * Reason: a deeplink is the only way into a command from outside the Raycast
 * runtime (`launchCommand` needs to be called from within a command), so every
 * segment is read from the manifest instead of hardcoded — renaming the author,
 * the extension, or the command then fails here loudly rather than opening
 * something stale.
 *
 * @param commandName - The command's `name` from package.json, e.g. `add-card`
 * @returns The `raycast://extensions/...` URL for that command
 * @throws When the manifest declares no such command
 */
function _buildCommandDeeplink(commandName: string): string {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    name: string;
    author: string;
    commands: { name: string }[];
  };
  const hasDeclaredCommand = manifest.commands.some((command) => command.name === commandName);
  if (!hasDeclaredCommand) {
    throw new Error(`package.json declares no command named "${commandName}".`);
  }
  return `raycast://extensions/${manifest.author}/${manifest.name}/${commandName}`;
}

/**
 * Opens one of the extension's commands and waits for Raycast to take focus.
 *
 * @param commandName - The command's `name` from package.json, e.g. `add-card`
 * @throws When Raycast does not come to the front, or the command is not in the manifest
 */
export async function openExtensionCommand(commandName: string): Promise<void> {
  execFileSync("open", [_buildCommandDeeplink(commandName)]);

  const deadline = Date.now() + FOCUS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (_readFrontmostAppName() === RAYCAST_APP_NAME) {
      // Reason: typing into the previous view would search the wrong list.
      await _sleep(COMMAND_RENDER_SETTLE_MS);
      return;
    }
    await _sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `Raycast never came to the front after opening "${commandName}" (frontmost: ${_readFrontmostAppName()}).`,
  );
}

/** Guards every keystroke on Raycast actually being frontmost. */
function _assertRaycastFocused(): void {
  const frontmostAppName = _readFrontmostAppName();
  if (frontmostAppName !== RAYCAST_APP_NAME) {
    throw new Error(`Refusing to send keys: ${frontmostAppName} is frontmost, not Raycast. Nothing was typed.`);
  }
}

/**
 * Types text into whatever Raycast has focused, then waits for the search it
 * triggers to settle — the wait is in the name because three seconds pass.
 *
 * @param text - The text to type; only sent while Raycast is frontmost
 */
export async function typeAndAwaitSearchResults(text: string): Promise<void> {
  _assertRaycastFocused();
  _runAppleScript(`tell application "System Events" to keystroke ${JSON.stringify(text)}`);
  await _sleep(SEARCH_SETTLE_MS);
}

/**
 * Presses Return — running the highlighted row's first action — then waits for
 * that action to round-trip to Supabase.
 */
export async function pressReturnAndAwaitDeckUpdate(): Promise<void> {
  _assertRaycastFocused();
  _runAppleScript(`tell application "System Events" to key code ${RETURN_KEY_CODE}`);
  await _sleep(ACTION_SETTLE_MS);
}

/** Closes Raycast, leaving the machine as it was found. */
export function dismissRaycast(): void {
  if (_readFrontmostAppName() !== RAYCAST_APP_NAME) {
    return;
  }
  _runAppleScript(`tell application "System Events" to key code ${ESCAPE_KEY_CODE}`);
}
