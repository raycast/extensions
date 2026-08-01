import { Action, ActionPanel, Icon } from "@raycast/api";
import type { ReactElement } from "react";
import type { Status } from "./lib/process";
import type { Tunnel } from "./lib/store";

export type TunnelRow = {
  tunnel: Tunnel;
  status: Status;
  uptime?: string;
  pid?: number;
};

type Props = {
  row: TunnelRow;
  addTunnelAction: ReactElement;
  onToggle: () => void;
  onRestart: () => void;
  onShowLogs: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TunnelRowActions({
  row,
  addTunnelAction,
  onToggle,
  onRestart,
  onShowLogs,
  onEdit,
  onDelete,
}: Props) {
  const running = row.status === "running";

  return (
    <ActionPanel>
      <ActionPanel.Submenu title="Tunnel Actions" icon={Icon.List}>
        <Action
          title={running ? "Stop Tunnel" : "Start Tunnel"}
          icon={running ? Icon.Stop : Icon.Play}
          shortcut={{ modifiers: [], key: "space" }}
          onAction={onToggle}
        />
        <Action
          title="Restart Tunnel"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRestart}
        />
        <Action.CopyToClipboard
          title="Copy Local Address"
          content={`localhost:${row.tunnel.localPort}`}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action
          title="Show Logs"
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={onShowLogs}
        />
        <Action
          title="Edit Tunnel"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={onEdit}
        />
        <Action
          title="Delete Tunnel"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={onDelete}
        />
      </ActionPanel.Submenu>
      {addTunnelAction}
    </ActionPanel>
  );
}
