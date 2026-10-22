import { apex } from "@lib/common";
import { popToRoot, showHUD } from "@raycast/api";
import open from "open";

async function main(): Promise<void> {
  const url = apex.preferCompanionApp ? apex.navigateUrl("") : await apex.nearestDefinedURL();
  open(url);
  showHUD("Open Dashboard");
  popToRoot();
}

main();
