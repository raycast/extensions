import { open } from "@raycast/api";

/**
 * Open a URL in the user's default browser.
 */
export async function openUrl(url: string): Promise<void> {
  await open(url);
}
