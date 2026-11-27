import { captureException, closeMainWindow, open } from "@raycast/api";
import { readPreferredBrowser } from "./preferences";

export async function openSearchLink(searchLink: string): Promise<boolean> {
  try {
    await open(searchLink, readPreferredBrowser());
  } catch (error) {
    captureException(error);
    return false;
  }
  await closeWindowAfterOpening();
  return true;
}

async function closeWindowAfterOpening(): Promise<void> {
  try {
    await closeMainWindow();
  } catch (error) {
    captureException(error);
  }
}
