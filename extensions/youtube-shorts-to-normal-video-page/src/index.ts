import { showHUD, getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface ScriptsPerBrowser {
  getURL: () => Promise<string>;
  setUrl: (url: string) => Promise<void>;
}

type Browser = "chrome" | "safari" | "arc";

const actions: Record<Browser, ScriptsPerBrowser> = {
  chrome: {
    async getURL() {
      const result = await runAppleScript(`
tell application "Google Chrome"
    get URL of active tab of first window
end tell
      `);
      return result;
    },
    async setUrl(url: string) {
      await runAppleScript(`
tell application "Google Chrome"
    set URL of active tab of window 1 to "${url}"
end tell
      `);
    },
  },

  safari: {
    async getURL() {
      const result = await runAppleScript(`
tell application "Safari" to get URL of front document
      `);
      return result;
    },
    async setUrl(url: string) {
      await runAppleScript(`
tell application "Safari"
    set URL of current tab of front window to "${url}"
end tell
      `);
    },
  },

  arc: {
    async getURL() {
      const result = await runAppleScript(`
tell application "Arc"
    set theUrl to URL of active tab of front window
end tell
      `);
      return result;
    },
    async setUrl(url: string) {
      await runAppleScript(`
tell application "Arc"
    set URL of active tab of front window to "${url}"
end tell
      `);
    },
  },
};

export default async function main() {
  const frontmostApp = await getFrontmostApplication();
  const action =
    frontmostApp.name === "Google Chrome"
      ? actions.chrome
      : frontmostApp.name === "Safari"
        ? actions.safari
        : frontmostApp.name === "Arc"
          ? actions.arc
          : null;

  if (!action) {
    await showHUD("Not supported browser");
    return;
  }

  const shortUrl = await action.getURL();
  const shortUrlRegExp = new RegExp(/https:\/\/www\.youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}/);
  if (!shortUrlRegExp.test(shortUrl)) {
    await showHUD("Selected text is not a youtube short url");
    return;
  }

  const regularUrl = shortUrl.replace("/shorts/", "/watch?v=");
  await action.setUrl(regularUrl);
  await showHUD("Successfully redirected to normal video page");
}
