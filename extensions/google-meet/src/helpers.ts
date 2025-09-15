import { getPreferenceValues, open, environment, BrowserExtension } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import {
  getOpenedBrowserScript,
  getOpenedUrlForArc,
  getOpenedUrlForFirefox,
  getOpenedUrlsScript,
  getSwitchToPreviousAppScript,
  SupportedBrowsers,
} from "./utils/scripts";

const openMeetTabUrl = "https://meet.google.com/new";

type Preferences = {
  preferredBrowser?: {
    name: SupportedBrowsers;
    path: string;
    bundleId: string;
  };
};

function getPreferredBrowser() {
  return getPreferenceValues<Preferences>().preferredBrowser;
}

async function getOpenTabs(): Promise<string> {
  const browserName = await getOpenedBrowser();

  if (browserName === "Arc") {
    return await runAppleScript(getOpenedUrlForArc());
  }

  if (browserName === "Firefox" || browserName === "Firefox Developer Edition") {
    return await runAppleScript(getOpenedUrlForFirefox(browserName));
  }

  return await runAppleScript(getOpenedUrlsScript(browserName));
}

export async function getOpenedBrowser(): Promise<SupportedBrowsers> {
  const preferredBrowser = getPreferredBrowser();

  if (preferredBrowser?.name) {
    return preferredBrowser.name;
  }

  return (await runAppleScript(getOpenedBrowserScript)) as SupportedBrowsers;
}

async function poll<T>(fn: () => Promise<T | undefined>, retries = 10, delay = 500): Promise<T> {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (result) {
      return result;
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error("Could not get Google Meet URL after multiple attempts.");
}

async function findMeetUrlWithAppleScript(): Promise<string | undefined> {
  const activeUrls = await getOpenTabs();
  const meetTab = activeUrls.split(",").find((url) => url.includes("meet.google.com"));

  if (meetTab && !meetTab.includes("/new")) {
    return meetTab;
  }
}

async function findMeetUrlWithBrowserExtension(): Promise<string | undefined> {
  const tabs = await BrowserExtension.getTabs();
  const meetTab = tabs.find((tab) => tab.url.includes("meet.google.com"));

  if (meetTab && !meetTab.url.includes("/new")) {
    return meetTab.url;
  }
}

export async function getMeetTab(): Promise<string> {
  if (environment.canAccess(BrowserExtension)) {
    return poll(findMeetUrlWithBrowserExtension);
  } else {
    return poll(findMeetUrlWithAppleScript);
  }
}

export async function openMeetTabDefaultProfile(): Promise<void> {
  const preferredBrowser = getPreferredBrowser();
  await open(openMeetTabUrl, preferredBrowser?.name);
}

export async function openMeetTabSelectedProfile(profile: string): Promise<void> {
  const preferredBrowser = getPreferredBrowser();
  await open(`${openMeetTabUrl}?authuser=${profile}`, preferredBrowser?.name);
}

export async function switchToPreviousApp() {
  return await runAppleScript(getSwitchToPreviousAppScript());
}
