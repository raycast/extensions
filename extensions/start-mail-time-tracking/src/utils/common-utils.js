import { Clipboard, showHUD, environment } from "@raycast/api";
import { BrowserExtension } from "@raycast/api";

import {
  getChromiumBrowserPath,
  getFocusWindowTitle,
} from "./applescript-utils.js";

export const isEmpty = (string) => {
  return !(string != null && String(string).length > 0);
};

export const copyGmailSubject = async (frontmostApp) => {
  // First, try using BrowserExtension API (works with any browser that has the extension)
  if (environment.canAccess(BrowserExtension)) {
    try {
      console.log("Trying BrowserExtension API...");
      const tabs = await BrowserExtension.getTabs();
      const activeTab = tabs.find((tab) => tab.active);

      if (
        activeTab &&
        activeTab.url &&
        activeTab.url.includes("mail.google.com")
      ) {
        console.log("Found Gmail tab via BrowserExtension API");

        // Extract subject from title (Gmail format: "Subject - sender@gmail.com - Gmail")
        let emailSubject = activeTab.title;
        if (emailSubject.includes(" - ")) {
          emailSubject = emailSubject.split(" - ")[0];
        }
        emailSubject = `Gmail: ${emailSubject}`;

        if (!isEmpty(emailSubject)) {
          await Clipboard.copy(emailSubject);
          await showHUD(`✅ Copied: "${emailSubject}"`);
          return emailSubject;
        }
      }
    } catch (error) {
      console.log("BrowserExtension API failed:", error);
    }
  }

  // Fallback to AppleScript for browsers that support it
  try {
    console.log("Trying AppleScript method...");
    const url = await getChromiumBrowserPath(frontmostApp.name);

    if (isEmpty(url)) {
      console.log("URL is empty - not a browser or couldn't get URL");
      return null;
    }

    if (!url.includes("mail.google.com")) {
      console.log("Not a Gmail URL");
      return null;
    }

    // Get window title which contains the email subject in Gmail
    const windowTitle = await getFocusWindowTitle(frontmostApp);
    let emailSubject = windowTitle.split(" - ")[0];
    emailSubject = `Gmail: ${emailSubject}`;

    if (isEmpty(emailSubject)) {
      console.log("Empty subject after extraction");
      return null;
    }

    await Clipboard.copy(emailSubject);
    await showHUD(`✅ Copied: "${emailSubject}"`);
    return emailSubject;
  } catch (e) {
    console.error("Error with AppleScript method:", String(e));
  }

  // Final fallback: Check if it's a browser but we couldn't get the URL
  if (
    frontmostApp.name.toLowerCase().includes("dia") ||
    frontmostApp.name.toLowerCase().includes("chrome") ||
    frontmostApp.name.toLowerCase().includes("safari") ||
    frontmostApp.name.toLowerCase().includes("firefox") ||
    frontmostApp.name.toLowerCase().includes("edge")
  ) {
    console.log(
      "Browser detected but couldn't get Gmail subject automatically",
    );
    await showHUD("⚠️ Please ensure you're on a Gmail page and try again");
    return null;
  }

  console.log("Not a supported browser");
  return null;
};

export const showLoadingHUD = async (title) => {
  await showHUD(title);
};
