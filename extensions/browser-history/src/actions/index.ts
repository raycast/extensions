import { closeMainWindow, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export async function openNewChromeTab(url: string): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script = `
    tell application "Google Chrome"
      activate
      tell window 1
          set newTab to make new tab with properties {URL:"${url}"}
      end tell
    end tell
  `;

  return await runAppleScript(script);
}

export async function openNewFirefoxTab(url: string): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script = `
    tell application "Firefox"
      activate
      repeat while not frontmost
        delay 0.1
      end repeat
      tell application "System Events"
        keystroke "t" using {command down}
        keystroke "l" using {command down}
           keystroke "a" using {command down}
           key code 51
           keystroke "${url}"
           key code 36
      end tell
    end tell
  `;

  return await runAppleScript(script);
}

export async function openNewSafariTab(url: string): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script = `
    tell application "Safari"
      tell window 1
          set current tab to (make new tab with properties {URL:"${url}"})
      end tell
    end tell
  `;

  return await runAppleScript(script);
}
