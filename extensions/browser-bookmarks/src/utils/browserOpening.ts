function validateBrowserBundleId(browserBundleId: string) {
  if (!/^[a-z0-9.-]+$/i.test(browserBundleId)) {
    throw new Error("Invalid browser bundle identifier");
  }
}

type BrowserAutomationOperations = {
  closeWindow: () => Promise<void>;
  runScript: (script: string, arguments_: string[]) => Promise<unknown>;
  openFallback: () => Promise<void>;
};

export async function runBrowserAutomation(
  script: string,
  url: string,
  { closeWindow, runScript, openFallback }: BrowserAutomationOperations,
) {
  try {
    await closeWindow();
    await runScript(script, [url]);
  } catch {
    await openFallback();
  }
}

function getChromiumAppleScript(browserBundleId: string, browserCommands: string) {
  validateBrowserBundleId(browserBundleId);

  return `
    using terms from application id "${browserBundleId}"
    on run argv
      set targetURL to item 1 of argv

      tell application id "${browserBundleId}"
${browserCommands}
        activate
      end tell
    end run
    end using terms from
  `;
}

export function getChromiumCurrentTabAppleScript(browserBundleId: string) {
  return getChromiumAppleScript(
    browserBundleId,
    `        if (count of windows) is 0 then
          set targetWindow to make new window
        else
          set targetWindow to front window
        end if
        set URL of active tab of targetWindow to targetURL`,
  );
}

export function getChromiumNewTabAppleScript(browserBundleId: string) {
  return getChromiumAppleScript(
    browserBundleId,
    `        if (count of windows) is 0 then
          set targetWindow to make new window
          set URL of active tab of targetWindow to targetURL
        else
          tell front window
            make new tab with properties {URL:targetURL}
            set active tab index to count of tabs
          end tell
        end if`,
  );
}

export function getChromiumNewWindowAppleScript(browserBundleId: string) {
  return getChromiumAppleScript(
    browserBundleId,
    `        set newWindow to make new window
        set URL of active tab of newWindow to targetURL`,
  );
}

export function getSafariCurrentTabAppleScript() {
  return `
    on run argv
      set targetURL to item 1 of argv
      tell application id "com.apple.Safari"
        if (count of windows) is 0 then
          make new document with properties {URL:targetURL}
        else
          set URL of current tab of front window to targetURL
        end if
        activate
      end tell
    end run
  `;
}

export function getSafariNewTabAppleScript() {
  return `
    on run argv
      set targetURL to item 1 of argv
      tell application id "com.apple.Safari"
        if (count of windows) is 0 then
          make new document with properties {URL:targetURL}
        else
          tell front window to set current tab to make new tab with properties {URL:targetURL}
        end if
        activate
      end tell
    end run
  `;
}

export function getSafariNewWindowAppleScript() {
  return `
    on run argv
      set targetURL to item 1 of argv
      tell application id "com.apple.Safari"
        make new document with properties {URL:targetURL}
        activate
      end tell
    end run
  `;
}
