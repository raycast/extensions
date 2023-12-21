import { closeMainWindow } from "@raycast/api";

import { Page } from "./notion/page";

export async function handleOnOpenPage(page: Page, setRecentPage: (page: Page) => Promise<void>): Promise<void> {
  if (!page.url) return;
  await setRecentPage(page);
  closeMainWindow();
}
