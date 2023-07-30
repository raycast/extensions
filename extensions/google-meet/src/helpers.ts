import { open } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import {
  getOpenedBrowserScript,
  getOpenedUrlForArc,
  getOpenedUrlForFirefox,
  getOpenedUrlsScript,
} from "./utils/scripts";

import type { SupportedBrowsers } from "./utils/scripts";

const openMeetTabUrl = "https://meet.google.com/new";

async function getOpenTabs(): Promise<string> {
  const browserName = await getDefaultOpenBrowser();

  if (browserName === "Arc") {
    return await runAppleScript(getOpenedUrlForArc());
  }

  if (browserName === "Firefox" || browserName === "Firefox Developer Edition") {
    return await runAppleScript(getOpenedUrlForFirefox(browserName));
  }

  return await runAppleScript(getOpenedUrlsScript(browserName));
}

export async function getDefaultOpenBrowser() {
  return (await runAppleScript(getOpenedBrowserScript)) as SupportedBrowsers;
}

/**
 * This needs be a recursive function because at first meet URL is not generated
 * but it depends on the browser to generate the correct URL, since it would not
 * be optimal to time it (setTimeout or something like that) because it's not possible
 * to guesse if it would take a long time or not to generate the correct URL, being
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
  await open(openMeetTabUrl);
}

export async function openMeetTabSelectedProfile(profile: string): Promise<void> {
  await open(`${openMeetTabUrl}?authuser=${profile}`);
}
