import { showHUD, showInFinder } from "@raycast/api";
import { getFvmContext } from "./lib/controller";
import { showActionToast } from "./lib/utils";

export default async function Commmand() {
  showActionToast({ title: "Opening FVM cache directory", cancelable: false });
  const response = await getFvmContext();
  await showInFinder(response.context.versionsCachePath);
  showHUD("Opened FVM cache directory");
}
