import { closeMainWindow, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { SupportedBrowsers } from "../interfaces";

export async function openNewTab(browser: SupportedBrowsers, url: string): Promise<boolean | string> {
  let appName = "";
  switch (browser) {
    case SupportedBrowsers.Chrome:
      appName = "Google Chrome";
      break;
    case SupportedBrowsers.Safari:
      appName = "Safari";
      break;
    case SupportedBrowsers.Edge:
      appName = "Microsoft Edge";
      break;
    case SupportedBrowsers.Brave:
      appName = "Brave Browser";
      break;
    case SupportedBrowsers.Vivaldi:
      appName = "Vivaldi";
      break;
    case SupportedBrowsers.Opera:
      appName = "Opera";
      break;
    case SupportedBrowsers.Iridium:
      appName = "Iridium";
      break;
    case SupportedBrowsers.Orion:
      appName = "Orion";
      break;
    case SupportedBrowsers.Sidekick:
      appName = "Sidekick";
      break;
    default:
      throw new Error(`Unsupported browser: ${browser}`);
  }

  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script = `
    tell application "${appName}"
      activate
      tell window 1
          set ${
            browser === SupportedBrowsers.Safari ? "current tab" : "newTab"
          } to make new tab with properties {URL:"${url}"}
      end tell
    end tell
    return
  `;

  return await runAppleScript(script);
}

export async function openNewArcTab(url: string): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script = `
    return do shell script "open -a Arc ${url}"
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
