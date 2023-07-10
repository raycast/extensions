import { closeMainWindow, getPreferenceValues, getApplications, open } from "@raycast/api";

import { Page } from "./types";

export async function getOpenIn() {
  const openIn = getPreferenceValues<Preferences>().open_in;
  let isNotionInstalled;

  if (openIn === "app") {
    const installedApplications = await getApplications();
    isNotionInstalled = installedApplications.some((app) => app.bundleId === "notion.id");

    return isNotionInstalled ? "app" : "web";
  }

  return "web";
}

export async function handleOnOpenPage(page: Page, setRecentPage: (page: Page) => Promise<void>): Promise<void> {
  if (!page.url) return;
  const openIn = await getOpenIn();
  open(openIn === "app" ? page.url.replace("https", "notion") : page.url);
  await setRecentPage(page);
  closeMainWindow();
}
