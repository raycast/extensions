import { popToRoot, showHUD } from "@raycast/api";
import { ha } from "./common";
import open from "open";

async function main(): Promise<void> {
  const url = await ha.nearestURL();
  open(url);
  showHUD("Open Dashboard");
  popToRoot();
}

main();
