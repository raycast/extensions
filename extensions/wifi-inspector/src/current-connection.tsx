import { NetworksCommand } from "./components/NetworksCommand";

export default function Command() {
  return (
    <NetworksCommand
      mode="current"
      searchBarPlaceholder="Filter current connection…"
      emptyTitle="Not connected to Wi-Fi"
      emptyDescription="Connect to a Wi-Fi network, then refresh. Ethernet-only setups will show this empty state."
    />
  );
}
