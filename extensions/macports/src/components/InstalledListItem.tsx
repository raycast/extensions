import { Action, ActionPanel, Alert, confirmAlert, Icon, List } from "@raycast/api";
import { uninstallPort } from "../exec";
import PortDetails from "../port-details";

export default function InstalledListItem({ port }: { port: string }) {
  return (
    <List.Item
      title={port}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Info} title="Details" target={<PortDetails portName={port} />} />
          <Action.OpenInBrowser title="Open in Browser" url={`https://ports.macports.org/port/${port}`} />
          <Action
            title="Uninstall"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              const options = {
                title: "Confirm Uninstall",
                message: `Are you sure you want to uninstall ${port}?`,
                primaryAction: {
                  title: "Uninstall",
                  style: Alert.ActionStyle.Destructive,
                },
              };

              if (await confirmAlert(options)) {
                uninstallPort(port);
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
