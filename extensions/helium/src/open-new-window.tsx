import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewWindow } from "./utils/browser-control";
import { describeError } from "./utils/errors";

export default async function Command() {
  try {
    await createNewWindow();
    await closeMainWindow();
  } catch (error) {
    await showHUD(describeError("Failed opening a new Helium window", error));
    console.error("Error opening new window:", error);
  }
}
