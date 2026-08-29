import { execa } from "execa";
import { dirname } from "path";

const HANDY_PROCESS_PATTERN = "Handy.app/Contents/MacOS/Handy";

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

function appBundlePathFromBinary(binaryPath: string): string {
  // …/Handy.app/Contents/MacOS/Handy → …/Handy.app
  return dirname(dirname(dirname(binaryPath)));
}

async function handyProcessPath(): Promise<string | null> {
  try {
    const { stdout } = await execa("osascript", [
      "-e",
      'tell application "System Events" to get posix path of (file of (application process "Handy"))',
    ]);
    const path = stdout.trim();
    if (path) return path;
  } catch {
    // ignore — fall through to binary-path derivation
  }
  return null;
}

async function isHandyRunning(): Promise<boolean> {
  try {
    await execa("pgrep", ["-f", HANDY_PROCESS_PATTERN]);
    return true;
  } catch {
    return false;
  }
}

async function quitHandy(): Promise<void> {
  try {
    await execa("osascript", ["-e", 'tell application "Handy" to quit']);
    return;
  } catch {
    // App may ignore AppleScript quit (e.g. busy); force it.
  }
  try {
    await execa("pkill", ["-f", HANDY_PROCESS_PATTERN]);
  } catch {
    // ignore — caller's waitForExit will time out and relaunch regardless
  }
}

async function waitForExit(timeoutMs = 6000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isHandyRunning())) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function launchHandy(handyBinaryPath: string): Promise<void> {
  const running = await handyProcessPath();
  const appPath = running ?? appBundlePathFromBinary(handyBinaryPath);
  try {
    await execa("open", [appPath]);
  } catch {
    await execa("open", ["-a", "Handy"]);
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
  apply();
  if (await isHandyRunning()) {
    await quitHandy();
    await waitForExit();
  }
  apply();
  await launchHandy(handyBinaryPath);
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
