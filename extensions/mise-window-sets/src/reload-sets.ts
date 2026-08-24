import { closeMainWindow, open, showHUD } from "@raycast/api";
import { reloadSetsURL } from "./sets";

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });
  await open(reloadSetsURL());
  await showHUD("Mise: reloading Sets");
}
