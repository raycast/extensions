import { runAppleScript } from "run-applescript";
import { closeMainWindow, getPreferenceValues, popToRoot } from "@raycast/api";
import { Preferences, SettingsProfileOpenBehaviour, Tab } from "../interfaces";
import { NOT_INSTALLED_MESSAGE } from "../constants";

export async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  const faviconFormula = useOriginalFavicon
    ? `execute of tab _tab_index of window _window_index javascript ¬
                    "document.head.querySelector('link[rel~=icon]').href;"`
    : '""';

  await checkAppInstalled();

  const { browserOption } = getPreferenceValues<Preferences>();

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
  openTabInProfile: SettingsProfileOpenBehaviour;
  newWindow?: boolean;
  incognito?: boolean;
}): Promise<boolean | string> {
  setTimeout(() => {
    popToRoot({ clearSearchBar: true });
  }, 3000);
  const installed = await checkAppInstalled();
  if (installed) {
    closeMainWindow({ clearRootSearch: true });
  }

  const { browserOption } = getPreferenceValues<Preferences>();

  let script = "";

  const getOpenInProfileCommand = (profile: string) =>
    `
    set profile to quoted form of "${profile}"
    set link to quoted form of "${url ? url : "about:blank"}"
    do shell script "open -na '${browserOption}' --args --profile-directory=" & profile & " " & link
  `;

  switch (openTabInProfile) {
    case SettingsProfileOpenBehaviour.Default:
      script =
        `
    tell application "${browserOption}"
      ${newWindow ? "make new window" : ""}
      ${incognito ? `make new window with properties {mode: "incognito"}` : ""}
      activate
      tell window 1
          set newTab to make new tab ` +
        (url
          ? `with properties {URL:"${url}"}`
          : query
          ? 'with properties {URL:"https://www.google.com/search?q=' + query + '"}'
          : "") +
        ` 
        ${newWindow || incognito ? "close tab 1" : ""}
      end tell
    end tell
    return true
  `;
      break;
    case SettingsProfileOpenBehaviour.ProfileCurrent:
      script = getOpenInProfileCommand(profileCurrent);
      break;
    case SettingsProfileOpenBehaviour.ProfileOriginal:
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      script = getOpenInProfileCommand(profileOriginal!);
      break;
  }

  return await runAppleScript(script);
}

export async function closeTab(tabIndex: number): Promise<void> {
  const { browserOption } = getPreferenceValues<Preferences>();
  await runAppleScript(`tell application "${browserOption}}"
    tell window 1
      delete tab ${tabIndex}
    end tell
  end tell`);
}

export async function setActiveTab(tab: Tab): Promise<void> {
  const { browserOption } = getPreferenceValues<Preferences>();
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
  const { browserOption } = getPreferenceValues<Preferences>();

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
