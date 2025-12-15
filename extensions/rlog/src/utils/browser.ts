import { runAppleScript } from "@raycast/utils";
import { Clipboard } from "@raycast/api";
import { getFirefoxTabs } from "./firefox";

export async function getActiveUrl(): Promise<string | null> {
  console.log("Starting getActiveUrl...");

  // Try to get URL from the frontmost browser
  try {
    // First, detect which browser is currently active
    const frontmostApp = await runAppleScript(
      'tell application "System Events" to get name of first application process whose frontmost is true',
    );
    console.log("Frontmost app:", frontmostApp);

    let browserUrl = "";

    // Only query the active browser
    if (frontmostApp === "Google Chrome") {
      try {
        browserUrl = await runAppleScript(
          'Application("Google Chrome").windows[0].activeTab.url()',
          { language: "JavaScript" },
        );
        console.log("Chrome URL:", browserUrl);
      } catch (e) {
        console.log("Chrome error:", e);
      }
    } else if (frontmostApp === "Safari") {
      try {
        browserUrl = await runAppleScript(
          'tell application "Safari" to return URL of current tab of front window',
        );
        console.log("Safari URL:", browserUrl);
      } catch (e) {
        console.log("Safari error:", e);
      }
    } else if (frontmostApp === "Firefox") {
      try {
        browserUrl = await runAppleScript(
          'tell application "Firefox" to return URL of active tab of front window',
        );
        console.log("Firefox URL:", browserUrl);
      } catch (e) {
        console.log("Firefox error:", e);
      }
    } else {
      console.log("Frontmost app is not a supported browser:", frontmostApp);
    }

    if (
      browserUrl &&
      (browserUrl.startsWith("http") || browserUrl.startsWith("https"))
    ) {
      return browserUrl;
    }
  } catch (e) {
    console.error("Browser detection error:", e);
  }

  // Fallback to Clipboard
  try {
    const text = await Clipboard.readText();
    console.log("Clipboard content:", text);
    if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
      return text;
    } else {
      console.log("Clipboard content is not a valid URL");
    }
  } catch (e) {
    console.error("Clipboard error:", e);
  }

  return null;
}

export async function getOpenTabs(): Promise<string[]> {
  try {
    const frontmostApp = await runAppleScript(
      'tell application "System Events" to get name of first application process whose frontmost is true',
    );

    if (frontmostApp === "Google Chrome") {
      // JXA for Chrome
      const urls = await runAppleScript(
        `
        const app = Application("Google Chrome");
        const tabs = app.windows[0].tabs();
        const urls = [];
        for (let i = 0; i < tabs.length; i++) {
          urls.push(tabs[i].url());
        }
        JSON.stringify(urls);
        `,
        { language: "JavaScript" },
      );
      return JSON.parse(urls);
    } else if (frontmostApp === "Safari") {
      // AppleScript for Safari
      const urls = await runAppleScript(
        'tell application "Safari" to return URL of every tab of front window',
      );
      // Safari returns comma-separated string or array depending on context.
      // Raycast's runAppleScript returns string.
      // If it's a list, it might be "url1, url2".
      // Let's try to parse it.
      return urls
        .split(",")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
    } else if (frontmostApp === "Firefox") {
      return getFirefoxTabs();
    }
  } catch (e) {
    console.error("Error fetching tabs:", e);
  }
  return [];
}
