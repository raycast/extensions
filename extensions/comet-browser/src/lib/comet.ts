import { runAppleScript } from "@raycast/utils";
import { CometTab, CometHistoryEntry, BrowserIntegration, CometError } from "./types";

export class CometBrowser implements BrowserIntegration {
  private async executeAppleScript(script: string): Promise<string> {
    try {
      const result = await runAppleScript(script);
      return result || "";
    } catch (error) {
      const cometError = new Error(`AppleScript execution failed: ${error}`) as CometError;
      cometError.code = "APPLESCRIPT_ERROR";
      cometError.recoverable = true;
      throw cometError;
    }
  }

  async getTabs(): Promise<CometTab[]> {
    try {
      const script = `
        tell application "Comet"
          if (count of windows) is 0 then
            return "NO_WINDOWS"
          end if
          
          set tabData to ""
          repeat with aTab in every tab of first window
            set tabId to (id of aTab) as string
            set tabUrl to URL of aTab
            set tabTitle to name of aTab
            set tabLoading to loading of aTab
            
            set tabData to tabData & tabId & "|||" & tabUrl & "|||" & tabTitle & "|||" & tabLoading & "\\n"
          end repeat
          
          return tabData
        end tell
      `;

      const response = await this.executeAppleScript(script);
      if (!response || response === "NO_WINDOWS" || response.trim() === "") {
        return [];
      }

      // Parse the tab data
      const tabs: CometTab[] = [];
      const lines = response.trim().split("\n");

      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split("|||");
          if (parts.length >= 4) {
            tabs.push({
              id: parts[0],
              url: parts[1],
              title: parts[2],
              loading: parts[3] === "true",
            });
          }
        }
      }

      return tabs;
    } catch (error) {
      console.error("Failed to get tabs:", error);
      return [];
    }
  }

  async getHistory(): Promise<CometHistoryEntry[]> {
    // History is accessed directly through the database hook
    // This method is kept for interface compatibility
    console.warn("getHistory should not be called directly - use useCometHistory hook instead");
    return [];
  }

  async switchToTab(tabId: string): Promise<void> {
    try {
      const script = `
        tell application "Comet"
          if (count of windows) is 0 then
            return
          end if
          
          set tabIndex to 1
          repeat with aTab in every tab of first window
            if (id of aTab as string) is "${tabId}" then
              set active tab index of first window to tabIndex
              activate
              return
            end if
            set tabIndex to tabIndex + 1
          end repeat
        end tell
      `;

      await this.executeAppleScript(script);
    } catch (error) {
      const cometError = new Error(`Failed to switch to tab: ${error}`) as CometError;
      cometError.code = "TAB_SWITCH_ERROR";
      throw cometError;
    }
  }

  async openUrl(url: string): Promise<void> {
    try {
      const script = `
        tell application "Comet"
          if (count of windows) is 0 then
            make new window
          end if
          
          set URL of active tab of first window to "${url}"
          activate
        end tell
      `;

      await this.executeAppleScript(script);
    } catch (error) {
      const cometError = new Error(`Failed to open URL: ${error}`) as CometError;
      cometError.code = "URL_OPEN_ERROR";
      throw cometError;
    }
  }

  async openInNewTab(url: string): Promise<void> {
    try {
      const script = `
        tell application "Comet"
          if (count of windows) is 0 then
            make new window
          end if
          
          tell first window
            make new tab with properties {URL:"${url}"}
          end tell
          
          activate
        end tell
      `;

      await this.executeAppleScript(script);
    } catch (error) {
      const cometError = new Error(`Failed to open URL in new tab: ${error}`) as CometError;
      cometError.code = "NEW_TAB_ERROR";
      throw cometError;
    }
  }

  async openNewTab(): Promise<void> {
    try {
      const script = `
        tell application "Comet"
          if (count of windows) is 0 then
            make new window
          else
            tell first window
              make new tab
            end tell
          end if
          
          activate
        end tell
      `;

      await this.executeAppleScript(script);
    } catch (error) {
      const cometError = new Error(`Failed to open new tab: ${error}`) as CometError;
      cometError.code = "NEW_TAB_ERROR";
      throw cometError;
    }
  }

  async isCometRunning(): Promise<boolean> {
    try {
      await this.executeAppleScript(`tell application "Comet" to get name`);
      return true;
    } catch {
      return false;
    }
  }
}

export const cometBrowser = new CometBrowser();
