import { Action, ActionPanel, List } from "@raycast/api";
import { uninstallPort } from "../exec";
import PortDetails from "../port-details";

export default function InstalledListItem({ port }: { port: string }) {
  return (
    <List.Item
      title={port}
      actions={
        <ActionPanel>
          <Action.Push title="Details" target={<PortDetails portName={port} />} />
          <Action.OpenInBrowser title="Open in Browser" url={`https://ports.macports.org/port/${port}`} />
          <Action title="Uninstall" onAction={() => uninstallPort(port)} />
        </ActionPanel>
      }
    />
  );
}
