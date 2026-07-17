import { LocalStorage } from "@raycast/api";
import { Tab } from "../interfaces";
import {
  NOT_INSTALLED_MESSAGE,
  WINDOW_INIT_RETRY_LIMIT,
  WINDOW_INIT_RETRY_DELAY,
  WINDOW_ACTIVATION_DELAY,
} from "../constants";
import { runAppleScript } from "@raycast/utils";

export async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  const faviconFormula = useOriginalFavicon
    ? `execute t javascript ¬
        "document.head.querySelector('link[rel~=icon]') ? document.head.querySelector('link[rel~=icon]').href : '';"`
    : '""';

  try {
    const startTime = Date.now();
    const openTabs = await runAppleScript(`
      set _output to ""
      tell application "Comet"
        repeat with w in windows
          set _w_id to get id of w as inches as string
          set _tab_index to 1
          repeat with t in tabs of w
            set _title to get title of t
            set _url to get URL of t
            set _favicon to ${faviconFormula}
            set _output to (_output & _title & "${Tab.TAB_CONTENTS_SEPARATOR}" & _url & "${Tab.TAB_CONTENTS_SEPARATOR}" & _favicon & "${Tab.TAB_CONTENTS_SEPARATOR}" & _w_id & "${Tab.TAB_CONTENTS_SEPARATOR}" & _tab_index & "\\n")
            set _tab_index to _tab_index + 1
          end repeat
        end repeat
      end tell
      return _output
  `);

    const tabs = openTabs
      .split("\n")
      .filter((line) => line.length !== 0)
      .map((line) => Tab.parse(line));

    console.debug(`Tab extraction took ${Date.now() - startTime}ms for ${tabs.length} tabs`);
    return tabs;
  } catch (err) {
    if ((err as Error).message.includes('Can\'t get application "Comet"')) {
      LocalStorage.removeItem("is-installed");
      throw new Error(NOT_INSTALLED_MESSAGE);
    }
    throw err;
  }
}

export async function setActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      activate
      set _wnd to first window where id is ${tab.windowsId}
      set index of _wnd to 1
      set active tab index of _wnd to ${tab.tabIndex}
    end tell
    return true
  `);
}

export async function closeActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      activate
      set _wnd to first window where id is ${tab.windowsId}
      set index of _wnd to 1
      set active tab index of _wnd to ${tab.tabIndex}
      close active tab of _wnd
    end tell
    return true
  `);
}

export async function createNewWindow(): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      make new window
      
      -- Small delay to ensure window is fully initialized before activation
      delay ${WINDOW_ACTIVATION_DELAY}
      activate
    end tell
    return true
  `);
}

export async function createNewTab(): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      -- Check if at least one window exists
      if (count of windows) > 0 then
        make new tab at end of tabs of window 1
        activate
      else
        -- No windows exist, create a new window with a tab
        make new window
        
        -- Wait for window to be fully initialized
        repeat with i from 1 to ${WINDOW_INIT_RETRY_LIMIT}
            if (count of windows) > 0 then
                exit repeat
            end if
            delay ${WINDOW_INIT_RETRY_DELAY}
        end repeat
        
        -- Additional small delay to ensure window is ready
        delay ${WINDOW_ACTIVATION_DELAY}
        activate
      end if
    end tell
    return true
  `);
}

export async function createNewTabToWebsite(website: string): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      activate
      open location "${website}"
    end tell
    return true
  `);
}

export async function createNewTabWithProfile(website?: string): Promise<void> {
  // Optimized logic: single AppleScript call with better error handling
  try {
    // Escape quotes and special characters in the URL to prevent injection
    const escapedWebsite = website ? website.replace(/"/g, '\\"').replace(/\\/g, "\\\\") : "";

    await runAppleScript(`
      tell application "Comet"
          set windowCount to count of windows
          
          if windowCount is 0 then
              -- Create new window and wait for initialization
              make new window
              repeat with i from 1 to ${WINDOW_INIT_RETRY_LIMIT}
                  if (count of windows) > 0 then
                      exit repeat
                  end if
                  delay ${WINDOW_INIT_RETRY_DELAY}
              end repeat
              delay ${WINDOW_ACTIVATION_DELAY}
          else
              activate
          end if

          -- Create tab in the first window
          tell window 1
              ${website ? `set newTab to make new tab with properties {URL:"${escapedWebsite}"}` : "make new tab"}
          end tell
      end tell
      return true
    `);
  } catch (error) {
    // Enhanced error handling with specific fallback strategies
    console.error("Failed to create tab with profile:", error);

    // Try simpler fallback approaches
    try {
      if (website) {
        await createNewTabToWebsite(website);
      } else {
        await createNewTab();
      }
    } catch (fallbackError) {
      console.error("Fallback tab creation also failed:", fallbackError);
      throw new Error(`Failed to create tab: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

export async function createNewIncognitoWindow(): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      make new window with properties {mode:"incognito"}
      
      -- Small delay to ensure window is fully initialized before activation
      delay ${WINDOW_ACTIVATION_DELAY}
      activate
    end tell
    return true
  `);
}
