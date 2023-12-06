import { closeMainWindow, getPreferenceValues, getApplications, open } from "@raycast/api";

import { Page } from "./notion/page";

let openIn = getPreferenceValues<Preferences>().openIn;

let hasCheckedDefault = false;
export async function checkedDefaultOpenMethod() {
  if (hasCheckedDefault) return;
  hasCheckedDefault = true;
  const apps = await getApplications();
  const defaultApp = apps.find((app) => app.name === "Notion");
  if (defaultApp) openIn = defaultApp;
}

export async function handleOnOpenPage(page: Page, setRecentPage: (page: Page) => Promise<void>): Promise<void> {
  if (!page.url) return;
  await checkedDefaultOpenMethod();
  open(page.url, openIn);
  await setRecentPage(page);
  closeMainWindow();
}

export function urlForPreferredMethod(url: string) {
  return openIn?.name === "Notion" ? url.replace("https", "notion") : url;
}
