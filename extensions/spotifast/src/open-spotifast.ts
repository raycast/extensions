import { closeMainWindow } from "@raycast/api";
import { showSpotifastError } from "./control";
import { openSpotifast } from "./spotifast";

export default async function Command(): Promise<void> {
  try {
    await closeMainWindow();
    await openSpotifast();
  } catch (error) {
    await showSpotifastError(error);
  }
}
