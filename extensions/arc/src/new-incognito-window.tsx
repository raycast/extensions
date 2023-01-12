import { showHUD, closeMainWindow } from "@raycast/api";
import { incognitoWindow } from "./utils/utils";

export default async function Command() {
  try {
    await incognitoWindow();
    await closeMainWindow();
  } catch {
    await showHUD("Could Not Create New Incognito Window");
  }
}
