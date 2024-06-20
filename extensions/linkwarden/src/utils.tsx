import { runAppleScript } from "@raycast/utils";

export const webkitBrowserNames = ["Safari", "Safari Technology Preview", "Orion"];

export const chromiumBrowserNames = [
  "Google Chrome",
  "Google Chrome Dev",
  "Google Chrome Beta",
  "Google Chrome Canary",
  "Microsoft Edge",
  "Microsoft Edge Dev",
  "Microsoft Edge Beta",
  "Microsoft Edge Canary",
  "Brave Browser",
  "Brave Browser Dev",
  "Brave Browser Beta",
  "Brave Browser Nightly",
  "Vivaldi",
  "Opera",
  "Arc",
  "Yandex",
  "SigmaOS",
];

// webkit browser
export const scriptWebkitBrowserPath = (app: string) => `
tell application "${app}"
    set currentURL to URL of current tab of front window
end tell
return currentURL`;

export const getWebkitBrowserPath = async (app: string) => {
  try {
    return await runAppleScript(scriptWebkitBrowserPath(app));
  } catch (e) {
    return "";
  }
};

// chromium browser
export const scriptChromiumBrowserPath = (app: string) => `
tell application "${app}"
    set currentURL to URL of active tab of front window
end tell
return currentURL`;

export const getChromiumBrowserPath = async (app: string) => {
  try {
    return await runAppleScript(scriptChromiumBrowserPath(app));
  } catch (e) {
    return "";
  }
};
