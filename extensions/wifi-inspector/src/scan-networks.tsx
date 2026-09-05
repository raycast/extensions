import { NetworksCommand } from "./components/NetworksCommand";

export default function Command() {
  return (
    <NetworksCommand
      mode="scan"
      searchBarPlaceholder="Filter networks by SSID, BSSID, band…"
      emptyTitle="No networks found"
      emptyDescription="Move closer to an access point, turn Wi-Fi on, or approve Location Services for WifiScanner."
    />
  );
}
