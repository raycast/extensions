import { PortsCommand } from "./components/PortsCommand";

export default function Command() {
  return (
    <PortsCommand
      filter="all"
      searchBarPlaceholder="Filter USB-C ports…"
      emptyTitle="No USB-C ports reported"
      emptyDescription="USB-C Inspector returned an empty port list. Try refreshing, or re-download the CLI."
    />
  );
}
