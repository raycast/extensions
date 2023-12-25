import { closeMainWindow, getPreferenceValues, getApplications, open } from "@raycast/api";

import { Page } from "./notion/page";

export let openIn = "web";
export let isNotionInstalled = false;

export async function checkOpenInApp() {
  const preferences = getPreferenceValues<Preferences>();

  const installedApplications = await getApplications();
  isNotionInstalled = installedApplications.some((app) => app.bundleId === "notion.id");

  if (preferences.open_in === "app") {
    openIn = isNotionInstalled ? "app" : "web";
  } else {
    openIn = "web";
  }
}

export async function handleOnOpenPage(
  page: Page,
  setRecentPage: (page: Page) => Promise<void>,
  openPageIn?: "web" | "app",
) {
  if (!page.url) return;
  const openAction = openPageIn || openIn;
  open(openAction === "app" ? page.url.replace("https", "notion") : page.url);
  await setRecentPage(page);
  closeMainWindow();
}
