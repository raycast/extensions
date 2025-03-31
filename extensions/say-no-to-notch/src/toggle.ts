import { showHUD, open } from "@raycast/api";
import { isAppInstalled, promptToInstall } from "./helpers";

export default async function main() {
  if (await isAppInstalled()) {
    open(`nonotch://toggle`);
    await showHUD("Toggled Notch");
  } else {
    await promptToInstall();
  }
}
