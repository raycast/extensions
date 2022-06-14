import { closeMainWindow, open, showHUD } from "@raycast/api";
import { scriptToGetOpenBunches } from "./utils/applescript-utils";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const openBunches = await scriptToGetOpenBunches();
  if (openBunches.length === 0) {
    await showHUD("No open bunches");
    return;
  }
  await open(encodeURI(`x-bunch://close/${openBunches.join(",")}`));
  await showHUD("Close bunches: " + openBunches.join(", "));
};
