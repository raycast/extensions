import {
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
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
    "conversation-awareness",
  );
  if (prefs.showHudCA && res) {
    showHUD(res);
    await updateCommandMetadata({ subtitle: `Status: ${res}` });
  }
}
