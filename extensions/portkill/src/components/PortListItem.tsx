import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { localEndpoint, localhostUrl, portDetailSubtitle } from "../lib/format";
import { killAllShortcut, openInBrowserShortcut, refreshShortcut, toggleDetailShortcut } from "../lib/shortcuts";
import type { PortProcess } from "../lib/types";

type PortListItemProps = {
  entry: PortProcess;
  onKill: (entry: PortProcess) => void;
  onRefresh: () => void;
  onKillAll: () => void;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
};

export function PortListItem({
  entry,
  onKill,
  onRefresh,
  onKillAll,
  isShowingDetail,
  onToggleDetail,
}: PortListItemProps) {
  const endpoint = localEndpoint(entry.endpoint);
  const browserUrl = localhostUrl(entry.port);

  return (
    <List.Item
      icon={{ source: Icon.Network, tintColor: Color.Green }}
      title={entry.processName}
      subtitle={portDetailSubtitle(entry)}
      accessories={[{ tag: { value: `:${entry.port}`, color: Color.Blue } }]}
      keywords={[String(entry.port), entry.processName, String(entry.pid), endpoint, entry.protocolName, browserUrl]}
      detail={
        <List.Item.Detail
          markdown={`### ${entry.processName}\n\nListening on **:${entry.port}**\n\nOpen in browser: [${browserUrl}](${browserUrl})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Port" text={String(entry.port)} />
              <List.Item.Detail.Metadata.Label title="PID" text={String(entry.pid)} />
              <List.Item.Detail.Metadata.Label title="Protocol" text={entry.protocolName} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Endpoint" text={endpoint} />
              {entry.endpoint.includes("->") ? (
                <List.Item.Detail.Metadata.Label title="Connection" text={entry.endpoint} />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Open in Browser" target={browserUrl} text={browserUrl} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Kill Process"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            onAction={() => onKill(entry)}
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={browserUrl}
            icon={Icon.Globe}
            shortcut={openInBrowserShortcut}
          />
          <ActionPanel.Section>
            <Action
              title={isShowingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              onAction={onToggleDetail}
              shortcut={toggleDetailShortcut}
            />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} shortcut={refreshShortcut} />
            <Action
              title="Kill All"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={onKillAll}
              shortcut={killAllShortcut}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy URL"
              content={browserUrl}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "c" },
                Windows: { modifiers: ["ctrl", "shift"], key: "c" },
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
