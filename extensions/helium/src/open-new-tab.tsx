import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewTab } from "./utils/browser-control";
import { describeError } from "./utils/errors";

export default async function Command() {
  try {
    await createNewTab();
    await closeMainWindow();
  } catch (error) {
    await showHUD(describeError("Failed opening a new Helium tab", error));
    console.error("Error opening new tab:", error);
  }
}
