import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execAirPodsMenu } from "./airpods-menu";

export default async function main() {
  const prefs = getPreferenceValues<Preferences>();
  const airpodsIndex = Number.parseInt(prefs.airpodsIndex, 10);
  if (!Number.isFinite(airpodsIndex) || airpodsIndex < 1) {
    await showFailureToast("", {
      title: "AirPods List Position must be a positive number",
    });
    return;
  }
  await closeMainWindow();
  const res = await execAirPodsMenu(
    {
      ...prefs,
      airpodsIndex,
    },
    "noise-control",
  );
  if (prefs.showHudNC && res) showHUD(res);
}
