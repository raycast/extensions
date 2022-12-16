import { runAppleScript } from "run-applescript";
import { closeMainWindow, popToRoot } from "@raycast/api";
import Tab from "./components/tab";

export async function openNewTabWithUrl(url: string | null | undefined): Promise<boolean | string> {
  url = url || "";

  const additionalScript = url ? `with properties {URL:newTabUrl}` : "";
  const script = `
    set newTabUrl to "${url}"
    tell application "Brave Browser"
      activate
      set targetWindow to item 1 of windows
      tell targetWindow
        set visible to false
        set visible to true
        set index to 1
      end tell      
      tell front window to make new tab at after (get active tab) ${additionalScript}      
    end tell
  `;

  const result = await runAppleScript(script);
  await popToRoot();
  await closeMainWindow({ clearRootSearch: true });

  return result;
}

export async function setActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Brave Browser"
      activate
      set visible of window (${tab.windowsIndex} as number) to true
      set index of window (${tab.windowsIndex} as number) to (${tab.windowsIndex} as number)
      set active tab index of window (${tab.windowsIndex} as number) to (${tab.tabIndex} as number)
    end tell
  `);
}
