import { closeMainWindow, open } from "@raycast/api";

export async function openBrowserSilently(url: string): Promise<void> {
  await closeMainWindow();
  await open(url);
}
