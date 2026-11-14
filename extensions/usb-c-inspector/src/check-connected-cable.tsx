import { PortsCommand } from "./components/PortsCommand";

export default function Command() {
  return (
    <PortsCommand
      filter="connected"
      searchBarPlaceholder="Filter connected cables…"
      emptyTitle="No cable connected"
      emptyDescription="Plug in a USB-C cable or charger, then refresh to inspect it."
    />
  );
}
