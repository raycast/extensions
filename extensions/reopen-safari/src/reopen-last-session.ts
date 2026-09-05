import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

// Localized menu item titles for "Reopen All Windows from Last Session".
// Unmatched locales fall back to a structural lookup (see AppleScript below).
const MENU_ITEM_NAMES = [
  "Reopen All Windows from Last Session", // English
  "마지막 세션에서 모든 윈도우 다시 열기", // Korean
  "最後のセッションのすべてのウインドウを開き直す", // Japanese
  "重新打开上次会话的所有窗口", // Chinese (Simplified)
  "重新開啟上次工作階段的所有視窗", // Chinese (Traditional)
  "Alle Fenster der letzten Sitzung erneut öffnen", // German
  "Rouvrir toutes les fenêtres de la dernière session", // French
  "Reabrir todas las ventanas de la última sesión", // Spanish
  "Riapri tutte le finestre dell'ultima sessione", // Italian
  "Reabrir Todas as Janelas da Última Sessão", // Portuguese
  "Открыть все окна последнего сеанса", // Russian
  "Alle vensters van vorige sessie opnieuw openen", // Dutch
];

const script = `
on clickReopenItem()
  tell application "System Events"
    tell process "Safari"
      set candidateNames to {${MENU_ITEM_NAMES.map((n) => JSON.stringify(n)).join(", ")}}

      -- The History menu is always the 6th menu bar item
      -- (Apple, Safari, File, Edit, View, History), regardless of locale.
      set historyMenu to menu 1 of menu bar item 6 of menu bar 1

      -- 1) Match by localized menu item title.
      repeat with mi in menu items of historyMenu
        set n to name of mi
        if n is not missing value and candidateNames contains n then
          if enabled of mi then
            click mi
            return "ok"
          else
            return "disabled"
          end if
        end if
      end repeat

      -- 2) Structural fallback for unmatched locales: the target sits two
      -- items below "Recently Closed", the first submenu item in History.
      set historyItems to menu items of historyMenu
      repeat with i from 1 to (count of historyItems)
        if exists menu 1 of (item i of historyItems) then
          set target to item (i + 2) of historyItems
          if name of target is not missing value then
            if enabled of target then
              click target
              return "ok"
            else
              return "disabled"
            end if
          end if
          exit repeat
        end if
      end repeat

      return "not-found"
    end tell
  end tell
end clickReopenItem

on run
  -- "launch" starts Safari without its initial start-page window, so the
  -- restored session windows are the only ones that ever appear.
  tell application "Safari" to launch

  tell application "System Events"
    repeat 100 times
      if exists process "Safari" then exit repeat
      delay 0.1
    end repeat
    tell process "Safari"
      repeat 100 times
        if exists menu bar 1 then exit repeat
        delay 0.1
      end repeat
    end tell
  end tell

  tell application "Safari" to set windowCountBefore to count of windows

  set clickResult to clickReopenItem()
  if clickResult is not "ok" then
    -- Still bring Safari forward so the user isn't left with an invisible app.
    tell application "Safari" to activate
    return clickResult
  end if

  -- Wait for the restored windows to appear, then bring them to the front.
  repeat 50 times
    tell application "Safari"
      if (count of windows) > windowCountBefore then exit repeat
    end tell
    delay 0.1
  end repeat

  tell application "Safari" to activate

  return "ok"
end run
`;

// Raycast may hand focus back to the previously frontmost app once the
// command finishes, so Safari is raised again after the HUD is shown.
const refocusScript = `
tell application "Safari"
  if it is running then activate
end tell
`;

export default async function main() {
  await closeMainWindow();

  try {
    const result = await runAppleScript(script, { timeout: 15000 });

    switch (result.trim()) {
      case "ok":
        await showHUD("✓ Reopened all windows from last session");
        await runAppleScript(refocusScript, { timeout: 5000 });
        break;
      case "disabled":
        await showHUD("Nothing to reopen — the last session may already be restored");
        break;
      default:
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't find the menu item",
          message: "Safari's History menu has no “Reopen All Windows from Last Session” entry.",
        });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to reopen last session",
      message:
        error instanceof Error && /not allowed assistive access|1002/i.test(error.message)
          ? "Grant Raycast Accessibility access in System Settings → Privacy & Security."
          : String(error),
    });
  }
}
