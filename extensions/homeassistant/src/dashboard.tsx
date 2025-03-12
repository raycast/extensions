import { ha } from "@lib/common";
import { getPreferenceValues, popToRoot, showHUD } from "@raycast/api";
import open from "open";

function dashboardPath() {
  const prefs = getPreferenceValues();
  const path: string | undefined = prefs.dashboardpath;

  if (!path || path.trim().length <= 0) {
    return "/";
  }
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
}

async function main() {
  const path = dashboardPath();
  const baseUrl = ha.preferCompanionApp ? ha.navigateUrl("") : await ha.nearestDefinedURL();
  const url = baseUrl + path;
  open(url);
  showHUD("Open Dashboard");
  popToRoot();
}

main();
