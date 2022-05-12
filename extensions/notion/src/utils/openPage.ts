import { closeMainWindow, getPreferenceValues, getApplications, open } from "@raycast/api";
import { Page } from "./notion";
import { storeRecentlyOpenedPage } from "./local-storage";

export async function handleOnOpenPage(page: Page): Promise<void> {
  if (!page.url) {
    return;
  }
  const openIn = getPreferenceValues().open_in;
  let isNotionInstalled;
  if (!openIn || openIn === "app") {
    const installedApplications = await getApplications();
    isNotionInstalled = installedApplications.some(function (app) {
      return app.bundleId === "notion.id";
    });
  }
  open(isNotionInstalled ? page.url.replace("https", "notion") : page.url);
  await storeRecentlyOpenedPage(page);
  closeMainWindow();
}
