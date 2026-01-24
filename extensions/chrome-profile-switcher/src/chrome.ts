import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const NEW_TAB_URL = "chrome://newtab";

export async function openChromeProfile(profileDirectory: string, displayName?: string) {
  try {
    const profileLabel = displayName ?? profileDirectory;
    const focusResult = String(
      await runAppleScript(focusProfileWindowScript(profileLabel, profileDirectory)),
    ).trim();
    const focused = focusResult === "focused";

    if (!focused) {
      if (focusResult === "no_accessibility") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Accessibility permission required",
          message: "Enable Accessibility for Raycast and Google Chrome, then try again.",
        });
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Profile window not found",
        message: "Open the profile first, then try again.",
      });
      return;
    }

    await runAppleScript(openNewTabInFrontWindowScript(NEW_TAB_URL));
    await closeMainWindow();
    await runAppleScript(focusChromeOmniboxScript());

    // await showToast({
    //   style: Toast.Style.Success,
    //   title: `Opening ${profileLabel}`,
    // });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Chrome profile",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function focusProfileWindowScript(profileName: string, profileDirectory: string) {
  const escapedName = profileName.replace(/"/g, '\\"');
  const escapedDirectory = profileDirectory.replace(/"/g, '\\"');
  return `
    set theProfileName to "${escapedName}"
    set theProfileDir to "${escapedDirectory}"
    set candidates to {theProfileName, theProfileDir}
    if theProfileDir is "Default" then
      set candidates to candidates & {"Default", "Person 1"}
    end if
    set didFocus to false

    try
      tell application "Google Chrome"
        repeat with w in windows
          try
            repeat with c in candidates
              if (name of w) contains c then
                set index of w to 1
                activate
                set didFocus to true
                exit repeat
              end if
            end repeat
            if didFocus is true then exit repeat
          end try
        end repeat
      end tell
    end try

    if didFocus is true then
      return "focused"
    end if

    try
      tell application "System Events"
        if UI elements enabled is false then
          return "no_accessibility"
        end if
        if exists process "Google Chrome" then
          tell process "Google Chrome"
            set frontmost to true
            repeat with c in candidates
              try
                set matches to (menu items of menu 1 of menu bar item "Window" of menu bar 1 whose name contains c)
                if (count of matches) > 0 then
                  click item 1 of matches
                  set didFocus to true
                  exit repeat
                end if
              end try
            end repeat

            if didFocus is false then
              repeat with c in candidates
                try
                  set matches to (menu items of menu 1 of menu bar item "Profiles" of menu bar 1 whose name contains c)
                  if (count of matches) > 0 then
                    click item 1 of matches
                    set didFocus to true
                    exit repeat
                  end if
                end try
                try
                  set matches to (menu items of menu 1 of menu bar item "People" of menu bar 1 whose name contains c)
                  if (count of matches) > 0 then
                    click item 1 of matches
                    set didFocus to true
                    exit repeat
                  end if
                end try
                try
                  set matches to (menu items of menu 1 of menu bar item "Profile" of menu bar 1 whose name contains c)
                  if (count of matches) > 0 then
                    click item 1 of matches
                    set didFocus to true
                    exit repeat
                  end if
                end try
              end repeat
            end if
          end tell
        end if
      end tell
    end try

    if didFocus is true then
      delay 0.2
      return "focused"
    end if
    return "not_found"
  `;
}

function openNewTabInFrontWindowScript(url: string) {
  const escapedUrl = url.replace(/"/g, '\\"');
  return `
    tell application "Google Chrome"
      activate
      delay 0.2
      if (count of windows) > 0 then
        tell front window to make new tab at end of tabs with properties {URL:"${escapedUrl}"}
      end if
    end tell
  `;
}

function focusChromeOmniboxScript() {
  return `
    tell application "Google Chrome" to activate
    delay 0.1
    tell application "System Events" to keystroke "l" using command down
  `;
}
