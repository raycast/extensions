import { Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { formatCompactPower } from "./format";
import { fetchFroniusSnapshot } from "./service";

export default async function Command() {
  const { baseUrl } = getPreferenceValues<Preferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Testing Fronius connection…" });

  try {
    const snapshot = await fetchFroniusSnapshot(baseUrl);
    await toast.hide();
    const inverterLabel = `${snapshot.inverters.length} inverter${snapshot.inverters.length === 1 ? "" : "s"}`;
    const pvPower = formatCompactPower(snapshot.site.P_PV);
    const details = [
      snapshot.apiVersion ? `API v${snapshot.apiVersion.APIVersion}` : undefined,
      inverterLabel,
      pvPower ? `${pvPower} PV` : undefined,
      snapshot.meters.length ? `${snapshot.meters.length} meter` : undefined,
      snapshot.storages.length ? `${snapshot.storages.length} battery` : undefined,
      snapshot.ohmpilots.length ? `${snapshot.ohmpilots.length} Ohmpilot` : undefined,
    ].filter(Boolean);
    await showHUD(`Connected · ${details.join(" · ")}`);
  } catch (error) {
    await toast.hide();
    await showHUD(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
