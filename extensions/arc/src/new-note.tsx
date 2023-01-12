import { showHUD, closeMainWindow } from "@raycast/api";
import { newNote } from "./utils/utils";

export default async function Command() {
  try {
    await newNote();
    await closeMainWindow();
  } catch {
    await showHUD("Could Not Create a New Note");
  }
}
