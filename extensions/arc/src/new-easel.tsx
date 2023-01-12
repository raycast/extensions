import { showHUD, closeMainWindow } from "@raycast/api";
import { newEasel } from "./utils/utils";

export default async function Command() {
  try {
    await newEasel();
    await closeMainWindow();
  } catch {
    await showHUD("Could Not Create a New Easel");
  }
}
