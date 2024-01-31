import { closeMainWindow, getPreferenceValues, getApplications, open } from "@raycast/api";

import { Page } from "./notion/page";

const open_in = getPreferenceValues<Preferences>().open_in;

let hasCheckedDefault = false;
export async function checkedDefaultOpenMethod() {
  if (hasCheckedDefault) return;
  hasCheckedDefault = true;
  const apps = await getApplications();
  const defaultApp = apps.find((app) => app.name === "Notion");
  if (defaultApp) return defaultApp;
  return open_in;
}

export async function handleOnOpenPage(page: Page, setRecentPage: (page: Page) => Promise<void>): Promise<void> {
  if (!page.url) return;
  await checkedDefaultOpenMethod();
  open(page.url, open_in);
  await setRecentPage(page);
  closeMainWindow();
}

export function urlForPreferredMethod(url: string) {
  return open_in?.name === "Notion" ? url.replace("https", "notion") : url;
}
