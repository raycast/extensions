import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { execAirPodsMenu } from "./airpods-menu";
import { Prefs } from "./type";

export default async function main() {
  const prefs = getPreferenceValues<Prefs>();
  await closeMainWindow();
  const res = await execAirPodsMenu(
    {
      ...prefs,
      airpodsIndex: parseInt(prefs.airpodsIndex, 10),
    },
    "noise-control",
  );
  if (prefs.showHudNC && res) showHUD(res);
}
