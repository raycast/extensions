import { closeMainWindow, showHUD } from "@raycast/api";
import clearList from "./helpers/clearList";

export default async function clearApplicationsList() {
  await clearList().catch(async (error) => {
    await showHUD(`Failed to clear list: ${error.message}`);
  });

  await closeMainWindow();
}
