import { closeMainWindow, showHUD } from "@raycast/api";
import { detectSetup, readStatus } from "./lib/pia";
import { fetchRegions } from "./lib/regions";

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });

  const setup = await detectSetup();
  if (setup.stage !== "ready" || !setup.cliPath) {
    await showHUD("PIA is not ready — open the app to finish setup");
    return;
  }

  const status = await readStatus(setup.cliPath);

  if (status.state === "Unknown") {
    await showHUD("Could not read PIA status — is the app running?");
    return;
  }

  if (status.state !== "Connected") {
    await showHUD(`🔴 Disconnected from PIA (${status.state})`);
    return;
  }

  // Prefer PIA's catalog name ("US New York") over the raw region id.
  let regionLabel = status.regionId ?? "";
  try {
    const regions = await fetchRegions();
    regionLabel = regions.find((r) => r.id === status.regionId)?.name ?? regionLabel;
  } catch {
    // Offline: the region id is still a reasonable label.
  }

  const details = [regionLabel, status.vpnIp].filter(Boolean).join(" · ");
  await showHUD(`🟢 Connected to PIA${details ? ` (${details})` : ""}`);
}
