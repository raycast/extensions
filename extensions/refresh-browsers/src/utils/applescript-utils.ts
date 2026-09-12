import { runAppleScript } from "@raycast/utils";
import { captureException } from "@raycast/api";
import { isNotEmpty } from "./common-utils";

const scriptTabCount = (browser: string) => `
tell application "${browser}"
  set totalTabs to 0
  repeat with w from 1 to (count of windows)
    tell window w
      repeat with t from 1 to (count of tabs)
        set totalTabs to totalTabs + 1
      end repeat
    end tell
  end repeat
  return totalTabs
end tell
`;
export const getTabCount = async (browser: string) => {
  try {
    return Number(await runAppleScript(scriptTabCount(browser)));
  } catch (e) {
    console.error(e);
    return 0;
  }
};

const scriptRefreshChrome = (browser: string) => `
tell application "${browser}"
  repeat with w from 1 to (count of windows)
    tell window w
      repeat with t from 1 to (count of tabs)
        tell tab t
          reload
        end tell
      end repeat
    end tell
  end repeat
end tell
`;
export const refreshChromium = async (browser: string) => {
  try {
    return await runAppleScript(scriptRefreshChrome(browser));
  } catch (e) {
    captureException(e);
    console.error(e);
    return String(e);
  }
};

const scriptRefreshWebkit = (browser: string) => `
tell application "${browser}"
  repeat with theWindow in every window
    repeat with theTab in every tab of theWindow
      tell theTab to do JavaScript "location.reload()"
    end repeat
  end repeat
end tell
`;
export const refreshWebkit = async (browser: string) => {
  try {
    return await runAppleScript(scriptRefreshWebkit(browser));
  } catch (e) {
    console.error(e);
    return String(e);
  }
};

export const refreshBrowser = async (browser: string) => {
  const retChromium = await refreshChromium(browser);
  if (isNotEmpty(retChromium)) {
    const retWebkit = await refreshWebkit(browser);
    return retWebkit;
  }
  return retChromium;
};
