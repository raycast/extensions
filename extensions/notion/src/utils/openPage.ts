import { closeMainWindow, getPreferenceValues, open } from "@raycast/api";

import { Page } from "./notion/page";

const openIn = getPreferenceValues<Preferences>().openIn;

export async function handleOnOpenPage(page: Page, setRecentPage: (page: Page) => Promise<void>): Promise<void> {
  if (!page.url) return;
  open(urlForPreferredMethod(page.url), openIn);
  await setRecentPage(page);
  closeMainWindow();
}

export function urlForPreferredMethod(url: string) {
  return openIn.name === "Notion" ? url.replace("https", "notion") : url;
}
