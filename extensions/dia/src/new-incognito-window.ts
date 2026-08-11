import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createNewIncognitoWindow } from "./dia";

export default async function Command() {
  try {
    await closeMainWindow();
    await createNewIncognitoWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening a new incognito window" });
  }
}
