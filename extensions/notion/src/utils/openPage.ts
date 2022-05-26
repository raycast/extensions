import { closeMainWindow, getPreferenceValues, getApplications, open } from "@raycast/api";
import { Page } from "./types";

export async function handleOnOpenPage(
  page: Page,
  storeRecentlyOpenedPage: (page: Page) => Promise<void>
): Promise<void> {
  if (!page.url) {
    return;
  }
  const openIn = getPreferenceValues().open_in;
  let isNotionInstalled;
  if (!openIn || openIn === "app") {
    const installedApplications = await getApplications();
    isNotionInstalled = installedApplications.some((app) => app.bundleId === "notion.id");
  }
  open(isNotionInstalled ? page.url.replace("https", "notion") : page.url);

  await storeRecentlyOpenedPage(page);
  closeMainWindow();
}
