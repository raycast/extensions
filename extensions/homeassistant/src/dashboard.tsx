import { popToRoot, showHUD } from "@raycast/api";
import { ha } from "@lib/common";
import open from "open";

async function main(): Promise<void> {
  const url = ha.preferCompanionApp ? ha.navigateUrl("") : await ha.nearestDefinedURL();
  open(url);
  showHUD("Open Dashboard");
  popToRoot();
}

main();
