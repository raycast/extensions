import { spawn } from "child_process";
import { showToast, Toast } from "@raycast/api";
import { BrowserConfig, Profile } from "./types";
import { extractProfiles, profileLabels, readChromeLocalState } from "./profiles";

// A complete action stays in one detached child, so closing Raycast cannot
// interrupt it between selecting a profile and opening or moving a tab.
function runDetachedCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: ["ignore", "pipe", "pipe"], timeout: 15000 });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (data: string) => {
      stdout += data;
    });
    child.stderr.setEncoding("utf8").on("data", (data: string) => {
      stderr += data;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.replace(/\r?\n$/, ""));
      else reject(new Error(stderr.trim() || "Chrome action failed or timed out"));
    });
    child.unref();
  });
}

function runChromeScript(script: string): Promise<string> {
  return runDetachedCommand("/usr/bin/osascript", ["-e", script]);
}

export type ChromeTarget =
  | { action: "focus" }
  | { action: "newTab" }
  | { action: "newWindow" }
  | { action: "openUrl"; url: string };

export const ChromeAction = {
  Focus: { action: "focus" } as const,
  NewTab: { action: "newTab" } as const,
  NewWindow: { action: "newWindow" } as const,
  openUrl: (url: string): ChromeTarget => ({ action: "openUrl", url }),
};

export function appleScriptString(value: string): string {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")}"`;
}

const scriptList = (values: string[]) => `{${values.map(appleScriptString).join(", ")}}`;

// Cocoa exposes Chrome's profile-menu action as an accessibility identifier.
// Unlike the menu title or index, it does not depend on language or menu order.
export function profileMenuScript(browser: BrowserConfig): string {
  return `
    on findProfileMenu()
      tell application "System Events" to tell process ${appleScriptString(browser.appName)}
        repeat with menuIndex from (count menu bar items of menu bar 1) to 1 by -1
          set barItem to menu bar item menuIndex of menu bar 1
          if exists menu 1 of barItem then
            repeat with profileItem in menu items of menu 1 of barItem
              if exists attribute "AXIdentifier" of profileItem then
                if value of attribute "AXIdentifier" of profileItem is "switchToProfileFromMenu:" then return menu 1 of barItem
              end if
            end repeat
          end if
        end repeat
      end tell
      error "Could not identify Chrome's Profiles menu. Check Raycast's Accessibility permission."
    end findProfileMenu

    on checkedProfileLabel(profileMenu)
      tell application "System Events"
        repeat with profileItem in menu items of profileMenu
          if exists attribute "AXMenuItemMarkChar" of profileItem then
            set mark to value of attribute "AXMenuItemMarkChar" of profileItem
            if mark is not missing value and mark is not "" then return name of profileItem
          end if
        end repeat
      end tell
      error "Could not identify the active Chrome profile"
    end checkedProfileLabel
  `;
}

async function loadProfiles(browser: BrowserConfig) {
  return extractProfiles((await readChromeLocalState(browser)).state.profile.info_cache);
}

function uniqueLabels(profile: Profile, profiles: Profile[]) {
  const labels = profileLabels(profile).filter(
    (label) => !profiles.some((other) => other.directory !== profile.directory && profileLabels(other).includes(label)),
  );
  return labels;
}

function selectProfileScript(profile: Profile, browser: BrowserConfig, profiles: Profile[]): string {
  const candidates = scriptList(uniqueLabels(profile, profiles));
  return `${profileMenuScript(browser)}
    on selectProfileWindow()
    with timeout of 10 seconds
    if (count ${candidates}) is 0 then error "Profile names are ambiguous. Give each Chrome profile a unique name."
    tell application ${appleScriptString(browser.appName)} to activate
    set profileMenu to my findProfileMenu()
    tell application "System Events"
      repeat with candidateName in ${candidates}
        if exists menu item (contents of candidateName) of profileMenu then
          click menu item (contents of candidateName) of profileMenu
          exit repeat
        end if
      end repeat
    end tell
    delay 0.3
    repeat 30 times
      if (my checkedProfileLabel(profileMenu)) is in ${candidates} then
        tell application ${appleScriptString(browser.appName)}
          if (count windows) > 0 then
            set selectedWindow to id of front window
            if mode of front window is "normal" then return selectedWindow
          end if
        end tell
      end if
      delay 0.1
    end repeat
    error "Chrome did not switch to the selected profile"
    end timeout
    end selectProfileWindow
  `;
}

export function launchArguments(
  profile: Profile,
  target: ChromeTarget,
  browser: BrowserConfig,
  coldStart = false,
): string[] {
  return [
    "-n",
    "-a",
    browser.appPath,
    "--args",
    `--profile-directory=${profile.directory}`,
    ...(target.action === "newWindow" || coldStart ? ["--new-window"] : []),
    ...(target.action === "openUrl" ? [target.url] : target.action === "newTab" ? ["chrome://newtab/"] : []),
  ];
}

export async function openGoogleChrome(
  profile: Profile,
  target: ChromeTarget,
  didOpen: () => Promise<void>,
  browser: BrowserConfig,
): Promise<boolean> {
  try {
    if (target.action === "newWindow") {
      await runDetachedCommand("/usr/bin/open", launchArguments(profile, target, browser));
    } else {
      const profiles = await loadProfiles(browser).catch(() => [profile]);
      const currentProfile = profiles.find((item) => item.directory === profile.directory) ?? profile;
      const selection = selectProfileScript(currentProfile, browser, profiles);
      const launchCommand = (coldStart: boolean) =>
        ["/usr/bin/open", ...launchArguments(profile, target, browser, coldStart)]
          .map((arg) => `quoted form of ${appleScriptString(arg)}`)
          .join(' & " " & ');
      await runChromeScript(`${selection}
        with timeout of 10 seconds
          if not (application ${appleScriptString(browser.appName)} is running) then
            do shell script ${launchCommand(true)}
            return
          end if
          try
            set targetWindow to my selectProfileWindow()
          on error
            do shell script ${launchCommand(false)}
            return
          end try
          tell application ${appleScriptString(browser.appName)}
            tell window id targetWindow
              ${
                target.action === "openUrl"
                  ? openUrlScript(target.url)
                  : target.action === "newTab"
                  ? `if URL of active tab is not "chrome://newtab/" then
                make new tab at end of tabs with properties {URL:"chrome://newtab/"}
                set active tab index to count tabs
              end if`
                  : ""
              }
            end tell
          end tell
        end timeout
      `);
    }
    // Keep Raycast alive until the action finishes so failures remain visible.
    await didOpen();
    return true;
  } catch (error) {
    await showToast(
      Toast.Style.Failure,
      "Could not open Chrome profile",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

function openUrlScript(url: string) {
  return `set targetURL to ${appleScriptString(url)}
    set foundTab to false
    repeat with t from 1 to count tabs
      if URL of tab t is targetURL then
        set active tab index to t
        set foundTab to true
        exit repeat
      end if
    end repeat
    if not foundTab then
      make new tab at end of tabs with properties {URL:targetURL}
      set active tab index to count tabs
    end if`;
}

export type SourceTab = { windowId: number; tabId: number; url: string; profile: Profile };

export async function readCurrentTab(browser: BrowserConfig, profiles: Profile[]): Promise<SourceTab> {
  const output = await runChromeScript(
    `${profileMenuScript(browser)}
    if not (application ${appleScriptString(browser.appName)} is running) then error "Open a Chrome tab first"
    set profileLabel to my checkedProfileLabel(my findProfileMenu())
    tell application ${appleScriptString(browser.appName)}
      if (count windows) is 0 then error "Open a Chrome tab first"
      if mode of front window is "incognito" then error "Moving incognito tabs is not supported"
      set sourceWindow to id of front window
      set sourceTab to id of active tab of front window
      set sourceURL to URL of active tab of front window
    end tell
    set separator to ASCII character 31
    if sourceURL contains separator or profileLabel contains separator then error "Unsupported tab URL or profile name"
    return (sourceWindow as text) & separator & (sourceTab as text) & separator & sourceURL & separator & profileLabel`,
  );
  const fields = output.split("\u001f");
  const [windowId, tabId, url, label] = fields;
  const matchingProfiles = profiles.filter((profile) => profileLabels(profile).includes(label));
  if (
    fields.length !== 4 ||
    matchingProfiles.length !== 1 ||
    !url ||
    !Number.isSafeInteger(Number(windowId)) ||
    !Number.isSafeInteger(Number(tabId)) ||
    Number(windowId) <= 0 ||
    Number(tabId) <= 0
  ) {
    throw new Error("Could not identify the current tab and its profile");
  }
  return { windowId: Number(windowId), tabId: Number(tabId), url, profile: matchingProfiles[0] };
}

export async function moveCurrentTab(
  source: SourceTab,
  destination: Profile,
  browser: BrowserConfig,
  profiles: Profile[],
) {
  if (source.profile.directory === destination.directory) throw new Error("Choose another profile");
  await runChromeScript(
    `${selectProfileScript(destination, browser, profiles)}
    set targetWindow to my selectProfileWindow()
    if targetWindow is ${
      source.windowId
    } then error "Chrome did not open the destination profile. The original tab was kept."
    with timeout of 10 seconds
    tell application ${appleScriptString(browser.appName)}
      set sourceWindow to window id ${source.windowId}
      set sourceTab to tab id ${source.tabId} of sourceWindow
      if URL of sourceTab is not ${appleScriptString(
        source.url,
      )} then error "The source tab changed. Run the command again."
      tell window id targetWindow
        ${openUrlScript(source.url)}
        set destinationTab to active tab
        if URL of destinationTab is not ${appleScriptString(
          source.url,
        )} then error "Could not confirm the destination tab. The original tab was kept."
      end tell
      if URL of sourceTab is not ${appleScriptString(
        source.url,
      )} then error "The source tab changed. The original tab was kept."
      close sourceTab
      activate
    end tell
    end timeout`,
  );
}
