import { closeMainWindow, getPreferenceValues, open } from "@raycast/api";

import { Page } from "./notion/page";

const open_in = getPreferenceValues<Preferences>().open_in;

export async function handleOnOpenPage(page: Page, setRecentPage: (page: Page) => Promise<void>): Promise<void> {
  if (!page.url) return;
  open(page.url, open_in);
  await setRecentPage(page);
  closeMainWindow();
}

export function urlForPreferredMethod(url: string) {
  // Keep the https URL so Notion can resolve access via universal links.
  return url;
}
