import { showHUD, open } from "@raycast/api";
import { isAppInstalled, promptToInstall } from "./helpers";

export default async function main() {
  if (await isAppInstalled()) {
    open(`nonotch://yes`);
    await showHUD("Removed Notch");
  } else {
    await promptToInstall();
  }
}
