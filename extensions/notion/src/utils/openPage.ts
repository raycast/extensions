import { closeMainWindow, getPreferenceValues, getApplications, open } from "@raycast/api";

import { Page } from "./notion/page";

export let openIn = "web";

export async function checkOpenInApp() {
  const preferences = getPreferenceValues<Preferences>();
  let isNotionInstalled;

  if (preferences.open_in === "app") {
    const installedApplications = await getApplications();
    isNotionInstalled = installedApplications.some((app) => app.bundleId === "notion.id");

    openIn = isNotionInstalled ? "app" : "web";
  } else {
    openIn = "web";
  }
}

export async function handleOnOpenPage(page: Page, setRecentPage: (page: Page) => Promise<void>): Promise<void> {
  if (!page.url) return;
  open(openIn === "app" ? page.url.replace("https", "notion") : page.url);
  await setRecentPage(page);
  closeMainWindow();
}
