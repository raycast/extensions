import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewIncognitoWindow } from "./utils/browser-control";
import { describeError } from "./utils/errors";

export default async function Command() {
  try {
    await createNewIncognitoWindow();
    await closeMainWindow();
  } catch (error) {
    await showHUD(describeError("Failed opening a new Helium incognito window", error));
    console.error("Error opening new incognito window:", error);
  }
}
