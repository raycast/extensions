import { getPreferenceValues, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import {
  getOpenedBrowserScript,
  getOpenedUrlForArc,
  getOpenedUrlForFirefox,
  getOpenedUrlsScript,
  supportedBrowsers,
} from "./utils/scripts";

import type { SupportedBrowsers } from "./utils/scripts";

const openMeetTabUrl = "https://meet.google.com/new";
const timeoutRegex = /^[0-9]+$/;
const defaultTimeoutMs = 500;

function isSupportedBrowserName(name: string): name is SupportedBrowsers {
  return supportedBrowsers.includes(name as SupportedBrowsers);
}

export function getTimeout(): number {
  const prefs = getPreferenceValues<Preferences>();
  return timeoutRegex.test(prefs.timeout) ? Number.parseInt(prefs.timeout, 10) : defaultTimeoutMs;
}

function getPreferredBrowser() {
  return getPreferenceValues<Preferences>().preferredBrowser;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getOpenTabs(): Promise<string> {
  const browserName = await getOpenedBrowser();

  if (browserName === "Arc") {
    return await runAppleScript(getOpenedUrlForArc());
  }

  if (browserName === "Firefox" || browserName === "Firefox Developer Edition" || browserName === "Zen") {
    return await runAppleScript(getOpenedUrlForFirefox(browserName));
  }

  return await runAppleScript(getOpenedUrlsScript(browserName));
}

export async function getOpenedBrowser(): Promise<SupportedBrowsers> {
  const preferredBrowser = getPreferredBrowser();

  if (preferredBrowser?.name && isSupportedBrowserName(preferredBrowser.name)) {
    return preferredBrowser.name;
  }

  return (await runAppleScript(getOpenedBrowserScript)) as SupportedBrowsers;
}

/**
 * This needs be a recursive function because at first meet URL is not generated
 * but it depends on the browser to generate the correct URL, since it would not
 * be optimal to time it (setTimeout or something like that) because it's not possible
 * to guess if it would take a long time or not to generate the correct URL, being
 * recursive works pretty ok, since it's not a big workload to process.
 */
export async function getMeetTab(): Promise<string> {
  const activeUrls = await getOpenTabs();
  const meetTab = activeUrls.split(",").find((url) => url.includes("meet.google.com"));

  if (meetTab?.includes("/new")) {
    return await getMeetTab();
  }

  return meetTab as string;
}

export async function openMeetTabDefaultProfile(): Promise<void> {
  const preferredBrowser = getPreferredBrowser();

  await open(openMeetTabUrl, preferredBrowser?.name);
}

export async function openMeetTabSelectedProfile(profile: string): Promise<void> {
  const preferredBrowser = getPreferredBrowser();

  await open(`${openMeetTabUrl}?authuser=${profile}`, preferredBrowser?.name);
}
