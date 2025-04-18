import { closeMainWindow } from "@raycast/api";
import { createNewIncognitoWindow } from "./scripts";

export default async function Command() {
  try {
    await closeMainWindow();
    await createNewIncognitoWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening a new incognito window" });
  }
}
