import { nightlight } from "./utils";
import { clearSearchBar, getPreferenceValues, closeMainWindow } from "@raycast/api";

export default async function main() {
  const { closeWindow } = getPreferenceValues<{ closeWindow: boolean }>();

  if (closeWindow) await closeMainWindow();
  else await clearSearchBar();

  await nightlight(["on"]);
}
