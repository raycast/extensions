import { showHUD, closeMainWindow } from "@raycast/api";
import { newFolder } from "./utils/utils";

export default async function Command() {
  try {
    await newFolder();
    await closeMainWindow();
  } catch {
    await showHUD("Could Not Create a New Folder");
  }
}
