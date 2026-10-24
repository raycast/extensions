import { runAppleScript } from "@raycast/utils";
import { closeMainWindow, popToRoot } from "@raycast/api";
import { SettingsProfileOpenBehaviour, Tab } from "../interfaces";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { execFile } from "node:child_process";
import { promisify } from "util";
import { showError } from "@chrismessina/raycast-kit";
import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { BrowserExtension, environment } from "@raycast/api";
import { isWindows, getBrowserName, requireBraveExecutable } from "../util/platform";
import { launchBrave, switchToTabByTitle, createNewTab } from "../util/windows-browser";

const execFileAsync = promisify(execFile);

export async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  if (isWindows) {
    requireBraveExecutable();
    if (!environment.canAccess(BrowserExtension)) return [];
    return (await BrowserExtension.getTabs()).map(
      (tab) => new Tab(tab.title || tab.url, tab.url, tab.favicon ?? "", 0, tab.id),
    );
  }
  const faviconFormula = useOriginalFavicon
    ? `execute of tab _tab_index of window _window_index javascript ¬
                    "document.head.querySelector('link[rel~=icon]').href;"`
    : '""';

  await checkAppInstalled();

  const browserOption = getBrowserName();

  const openTabs = await runAppleScript(`
      set _output to ""
      tell application "${browserOption}"
        set _window_index to 1
        repeat with w in windows
          set _tab_index to 1
          repeat with t in tabs of w
            set _title to get title of t
            set _url to get URL of t
            set _favicon to ${faviconFormula}
            set _output to (_output & _title & "${Tab.TAB_CONTENTS_SEPARATOR}" & _url & "${Tab.TAB_CONTENTS_SEPARATOR}" & _favicon & "${Tab.TAB_CONTENTS_SEPARATOR}" & _window_index & "${Tab.TAB_CONTENTS_SEPARATOR}" & _tab_index & "\\n")
            set _tab_index to _tab_index + 1
          end repeat
          set _window_index to _window_index + 1
          if _window_index > count windows then exit repeat
        end repeat
      end tell
      return _output
  `);

  return openTabs
    .split("\n")
    .filter((line) => line.length !== 0)
    .map((line) => Tab.parse(line));
}

export async function openAllBookmarksInFolder({
  urls,
  profileCurrent,
  openTabInProfile,
}: {
  urls: string[];
  profileCurrent: string;
  openTabInProfile: Preferences["openTabInProfile"];
}): Promise<void> {
  try {
    const browserOption = getBrowserName();

    const buildArgs = (profile?: string): string[] => {
      const args: string[] = [];
      if (profile) {
        args.push(`--profile-directory=${profile}`);
      }
      return args;
    };

    let args: string[] = [];
    switch (openTabInProfile) {
      case SettingsProfileOpenBehaviour.Default:
        args = buildArgs();
        break;
      case SettingsProfileOpenBehaviour.ProfileCurrent:
        args = buildArgs(profileCurrent);
        break;
      case SettingsProfileOpenBehaviour.ProfileOriginal:
        // This is not supported when opening multiple urls, so we fallback to the current profile
        args = buildArgs(profileCurrent);
        break;
    }

    if (isWindows) await launchBrave([...args, ...urls.filter((url) => !url.toLowerCase().startsWith("javascript:"))]);
    else await execFileAsync("open", ["-na", browserOption, "--args", ...args, ...urls]);
    await closeMainWindow({ clearRootSearch: true });
  } catch (e) {
    console.error(e);
    await showError(e, { title: "Could Not Open All Bookmarks" });
  }
}

export async function openNewTab({
  url,
  query,
  profileCurrent,
  profileOriginal,
  openTabInProfile,
  newWindow,
  incognito,
}: {
  url?: string;
  query?: string;
  profileCurrent: string;
  profileOriginal?: string;
  openTabInProfile: Preferences["openTabInProfile"];
  newWindow?: boolean;
  incognito?: boolean;
}): Promise<boolean | string> {
  try {
    await checkAppInstalled();
    const browserOption = getBrowserName();
    const targetUrl = url ? url : query ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : "";

    // Build command arguments based on options
    const buildArgs = (profile?: string): string[] => {
      const args: string[] = [];
      if (profile) {
        args.push(`--profile-directory=${profile}`);
      }
      if (newWindow) {
        args.push("--new-window");
      }
      if (incognito) {
        args.push("--incognito");
      }
      if (targetUrl) {
        args.push(targetUrl);
      }
      return args;
    };

    let args: string[] = [];

    switch (openTabInProfile) {
      case SettingsProfileOpenBehaviour.Default:
        args = buildArgs();
        break;
      case SettingsProfileOpenBehaviour.ProfileCurrent:
        args = buildArgs(profileCurrent);
        break;
      case SettingsProfileOpenBehaviour.ProfileOriginal:
        args = buildArgs(profileOriginal);
        break;
    }

    if (isWindows) {
      if (!targetUrl && !newWindow && !incognito && openTabInProfile === SettingsProfileOpenBehaviour.Default)
        await createNewTab();
      else await launchBrave(args.length ? args : ["brave://newtab/"]);
    } else await execFileAsync("open", ["-na", browserOption, "--args", ...args]);
    await closeMainWindow({ clearRootSearch: true });
    await popToRoot({ clearSearchBar: true });
    return true;
  } catch (error) {
    await showError(error, {
      title: incognito
        ? "Could Not Open Private Window"
        : newWindow
          ? "Could Not Open Brave Window"
          : "Could Not Open Brave Tab",
    });
    return false;
  }
}

export async function closeTab(tabIndex: number): Promise<void> {
  if (isWindows) throw new Error("Closing tabs is available on macOS only.");
  const browserOption = getBrowserName();
  await runAppleScript(`tell application "${browserOption}"
    tell window 1
      delete tab ${tabIndex}
    end tell
  end tell`);
}

export async function setActiveTab(tab: Tab): Promise<void> {
  if (isWindows) {
    await closeMainWindow();
    await switchToTabByTitle(tab.title);
    return;
  }
  const browserOption = getBrowserName();
  await runAppleScript(`
    tell application "${browserOption}"
      activate
      set index of window (${tab.windowsIndex} as number) to (${tab.windowsIndex} as number)
      set active tab index of window (${tab.windowsIndex} as number) to (${tab.tabIndex} as number)
    end tell
    return true
  `);
}

const checkAppInstalled = async (): Promise<boolean> => {
  if (isWindows) {
    requireBraveExecutable();
    return true;
  }
  const browserOption = getBrowserName();

  const appInstalled = await runAppleScript(`
set isInstalled to false
try
    do shell script "osascript -e 'exists application \\"${browserOption}\\"'"
    set isInstalled to true
end try

return isInstalled`);
  if (appInstalled === "false") {
    throw new Error(NOT_INSTALLED_MESSAGE);
  }
  return true;
};

export async function executeJavascript(code: string): Promise<void> {
  const browserOption = getBrowserName();

  try {
    if (isWindows)
      throw new Error("Running bookmarklets is available on macOS only. Copy the code to run it manually in Brave.");
    const decodedCode = decodeURIComponent(code);

    // We manually escape the characters that break AppleScript strings.
    // This is safer than JSON.stringify because we control the exact output format.
    const escapedCode = decodedCode
      .replace(/\\/g, "\\\\") // Escape backslashes first!
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/\r/g, "\\r") // Escape Carriage Return
      .replace(/\n/g, "\\n") // Escape New Line
      .replace(/\t/g, "\\t") // Escape Tab
      .replace(/[\b]/g, "\\b") // Escape Backspace
      .replace(/\f/g, "\\f"); // Escape Form Feed

    const script = `
      tell application "${browserOption}"
        activate
        tell active tab of front window
          execute javascript "${escapedCode}"
        end tell
      end tell
    `;
    await runAppleScript(script);
    await closeMainWindow();
  } catch (e) {
    console.error(e);
    await showError(e, {
      title: "Could Not Run Bookmarklet",
      message: getErrorMessage(e).includes("Allow JavaScript from Apple Events")
        ? "Enable View > Developer > Allow JavaScript from Apple Events in Brave."
        : undefined,
    });
  }
}
