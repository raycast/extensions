import { closeMainWindow } from "@raycast/api";
import { toggleGlobalHiddenFiles } from "./shared/utils";

export default async function Command() {
  await closeMainWindow(); // Immediately close the Raycast window
  await toggleGlobalHiddenFiles();
}
