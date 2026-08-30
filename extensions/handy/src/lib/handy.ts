import { execa } from "execa";

const DEFAULT_HANDY_BINARY_PATH =
  "/Applications/Handy.app/Contents/MacOS/Handy";
const HANDY_PROCESS_NAME = "Handy";

/**
 * Handy is a single-instance Tauri app. Changing the model/language inside Handy
 * calls a Rust command (`set_active_model` / `change_selected_language_setting`)
 * that updates the running app instantly — there is no restart and no external
 * CLI flag or URL scheme to invoke it. So to switch the live model without
 * restarting, we drive Handy's own menu (the same "Model" item the user would
 * click), which triggers that command.
 *
 * When GUI scripting isn't possible (Accessibility permission not granted, the
 * tray hidden via `--no-tray`, or the item can't be found), we fall back to
 * `applySettingsAndReload`, which persists the setting and relaunches Handy so it
 * loads the new value at launch.
 */

function normalizedBinaryPath(binaryPath: string): string {
  return binaryPath.trim() || DEFAULT_HANDY_BINARY_PATH;
}

function appBundlePathFromBinary(binaryPath: string): string | null {
  const match = binaryPath.match(/^(.*\.app)\/Contents\/MacOS\/[^/]+$/);
  return match?.[1] ?? null;
}

function escapeExtendedRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function processPatternsForBinary(binaryPath: string): string[] {
  const normalized = normalizedBinaryPath(binaryPath);
  const appPath = appBundlePathFromBinary(normalized);
  return Array.from(
    new Set(
      [
        normalized,
        appPath ? `${appPath}/Contents/MacOS/${HANDY_PROCESS_NAME}` : null,
      ]
        .filter((pattern): pattern is string => Boolean(pattern))
        .map(escapeExtendedRegex),
    ),
  );
}

async function isHandyRunning(handyBinaryPath: string): Promise<boolean> {
  for (const pattern of processPatternsForBinary(handyBinaryPath)) {
    try {
      await execa("pgrep", ["-f", pattern]);
      return true;
    } catch {
      // try the next process matcher
    }
  }
  return false;
}

async function pkillHandy(
  handyBinaryPath: string,
  force = false,
): Promise<void> {
  for (const pattern of processPatternsForBinary(handyBinaryPath)) {
    try {
      await execa("pkill", [...(force ? ["-9"] : []), "-f", pattern]);
    } catch {
      // process may already be gone, or this pattern may not match this install
    }
  }
}

async function quitHandy(handyBinaryPath: string): Promise<void> {
  const binaryPath = normalizedBinaryPath(handyBinaryPath);
  const appPath = appBundlePathFromBinary(binaryPath) ?? HANDY_PROCESS_NAME;
  try {
    await execa("osascript", [
      "-e",
      `tell application "${escapeAppleScriptString(appPath)}" to quit`,
    ]);
  } catch {
    // App may ignore AppleScript quit (e.g. busy); force it.
  }
  if (await waitForExit(handyBinaryPath)) return;

  await pkillHandy(handyBinaryPath);
  if (await waitForExit(handyBinaryPath)) return;

  await pkillHandy(handyBinaryPath, true);
  if (!(await waitForExit(handyBinaryPath))) {
    throw new Error("Handy did not quit; restart canceled");
  }
}

async function waitForExit(
  handyBinaryPath: string,
  timeoutMs = 6000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isHandyRunning(handyBinaryPath))) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return !(await isHandyRunning(handyBinaryPath));
}

async function launchHandy(handyBinaryPath: string): Promise<void> {
  const binaryPath = normalizedBinaryPath(handyBinaryPath);
  const appPath = appBundlePathFromBinary(binaryPath) ?? binaryPath;
  try {
    await execa("open", [appPath]);
  } catch {
    await execa("open", ["-a", appPath]);
  }
}

/**
 * Persist `apply` (writes `settings_store.json`), then relaunch Handy so the
 * running app loads the new value. The setting is written again after the app
 * exits to survive any shutdown-time flush of the old in-memory settings. Used
 * as a fallback when live GUI scripting isn't available.
 */
export async function applySettingsAndReload(
  apply: () => void,
  handyBinaryPath: string,
): Promise<void> {
  const binaryPath = normalizedBinaryPath(handyBinaryPath);
  apply();
  if (await isHandyRunning(binaryPath)) {
    await quitHandy(binaryPath);
  }
  apply();
  await launchHandy(binaryPath);
}

/**
 * AppleScript that activates Handy and clicks the menu item matching `targetName`
 * inside any submenu of its status-bar/tray menu (trying the tray first, then the
 * app menu). Handy exposes its model list under a submenu whose title is the
 * *currently active* model (not a fixed "Model" item), so we search every tray
 * submenu. Matching requires an exact title so similarly named models/languages
 * cannot be selected accidentally. Returns "OK" if clicked, "FAIL" otherwise.
 */
function menuClickScript(): string {
  return [
    "on run argv",
    "  set targetName to item 1 of argv",
    '  tell application "Handy" to activate',
    "  delay 0.3",
    "  set ok to false",
    '  tell application "System Events"',
    '    tell process "Handy"',
    "      repeat with barIndex in {2, 1}",
    "        set bi to barIndex as integer",
    "        try",
    "          set bar to menu bar bi",
    "          set topItems to every menu item of menu 1 of (menu bar item 1 of bar)",
    "          repeat with mi in topItems",
    "            try",
    "              set subItems to every menu item of menu 1 of mi",
    "              repeat with si in subItems",
    "                set sn to name of si",
    "                if sn is not missing value then",
    "                  ignoring case",
    "                    set isMatch to sn is targetName",
    "                  end ignoring",
    "                  if isMatch then",
    "                    click mi",
    "                    delay 0.2",
    "                    click si",
    "                    set ok to true",
    "                    exit repeat",
    "                  end if",
    "                end if",
    "              end repeat",
    "              if ok then exit repeat",
    "              end try",
    "            end repeat",
    "          if ok then exit repeat",
    "        end try",
    "      end repeat",
    "    end tell",
    "  end tell",
    "  if ok then",
    '    return "OK"',
    "  else",
    '    return "FAIL"',
    "  end if",
    "end run",
  ].join("\n");
}

async function clickHandyMenuItem(item: string): Promise<boolean> {
  try {
    const { stdout } = await execa("osascript", [
      "-e",
      menuClickScript(),
      item,
    ]);
    return stdout.trim() === "OK";
  } catch {
    return false;
  }
}

/** Switch the active model in the running Handy app (no restart) by clicking its model submenu. */
export async function selectModelInHandy(modelName: string): Promise<boolean> {
  return clickHandyMenuItem(modelName);
}

/** Switch the transcription language in the running Handy app (no restart). */
export async function selectLanguageInHandy(
  langLabel: string,
): Promise<boolean> {
  return clickHandyMenuItem(langLabel);
}
