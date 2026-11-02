import { open, showHUD } from "@raycast/api";
import { supervocPreferences } from "./preferences";

export default async function OpenTokenPageCommand() {
  const { supervocServerURL } = supervocPreferences();
  if (!supervocServerURL) {
    await showHUD("Set the Supervoc Server URL in extension preferences");
    return;
  }
  await open(`${supervocServerURL}/token`);
  await showHUD("Opened the Supervoc token page");
}
