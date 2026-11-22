import { closeMainWindow, PopToRootType, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { toAppleScript } from "../keys";
import { Shortcut } from "../shortcuts";
import { SUPPORTED_BROWSERS } from "./browser";

const NOT_BROWSER = "BRICKS_NOT_BROWSER:";

// Keystrokes go to whatever app is frontmost, and a Bricks shortcut like ⌘⌫ would move files to the
// Trash in Finder, so the script only presses when a supported browser is in front.
/** Hides Raycast and presses the shortcut in the app that was in front (the Bricks tab). */
export async function pressShortcut(shortcut: Shortcut, label: string) {
  // Popping to root here would unload the command before the AppleScript runs,
  // so hide the window, press the keys, and only reset Raycast afterwards.
  await closeMainWindow({ popToRootType: PopToRootType.Suspended });
  const hudOptions = { clearRootSearch: true, popToRootType: PopToRootType.Immediate };
  try {
    const app = await runAppleScript(toAppleScript(shortcut, { apps: SUPPORTED_BROWSERS, errorPrefix: NOT_BROWSER }));
    await showHUD(`Pressed ${label} in ${app}`, hudOptions);
  } catch (error) {
    console.error(error);
    const message = String(error);
    const notBrowser = message.match(new RegExp(`${NOT_BROWSER}(.*?)(?:"|\\(-\\d+\\)|$)`, "m"));
    if (notBrowser) {
      const app = notBrowser[1].trim();
      await showHUD(
        `Bring your browser with Bricks to the front first${app ? ` (${app} is in front)` : ""}. Nothing was pressed.`,
        hudOptions,
      );
      return;
    }
    // -1719 / -25211 / 1002: the caller isn't allowed to control the computer.
    const needsAccessibility = /-1719|-25211|1002|not allowed/i.test(message);
    await showHUD(
      needsAccessibility
        ? "Allow Raycast in System Settings › Privacy & Security › Accessibility"
        : `Couldn't press ${label}: ${message}`,
      hudOptions,
    );
  }
}
