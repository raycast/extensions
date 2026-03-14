import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
} from "@raycast/api";
import { useCallback } from "react";
import { SmitheryServer } from "../../api/types";
import { buildMcpRemoveCommand } from "../../constants/commands";
import { buildMcpServerUrl } from "../../constants/urls";
import {
  formatCompactNumber,
  formatDate,
  formatScoreOutOf100,
  scoreToColor,
} from "../../utils/format";
import {
  uninstallMcp,
  type InstalledMcpItem,
} from "../../utils/local-installs";
import { getSmitheryExecutable } from "../../utils/smithery";
import {
  showFailureToast,
  showRunningToast,
  showSuccessToast,
} from "../../utils/toast";

type McpInstalledItemProps = {
  item: InstalledMcpItem;
  summary?: SmitheryServer | null;
  summaryLoading: boolean;
  onToggleDetail: () => void;
  isShowingDetail: boolean;
  onUpdated: () => void | Promise<unknown>;
};

export function McpInstalledItem({
  item,
  summary,
  summaryLoading,
  onToggleDetail,
  isShowingDetail,
  onUpdated,
}: McpInstalledItemProps) {
  const removeCommand = buildMcpRemoveCommand(
    item.id,
    item.client,
    getSmitheryExecutable(),
  );
  const serverUrl = buildMcpServerUrl(item.id);
  const uses = formatCompactNumber(summary?.useCount);
  const score = formatScoreOutOf100(summary?.score);
  const createdDate = formatDate(summary?.createdAt);

  const handleRemove = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: `Uninstall ${item.id}?`,
      message: `Remove this MCP server from ${item.clientTitle}.`,
      primaryAction: {
        title: "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showRunningToast(
      `Removing ${item.id}`,
      `From ${item.clientTitle}...`,
    );
    try {
      await uninstallMcp(item.id, item.client);
      showSuccessToast(
        toast,
        `Removed ${item.id}`,
        `From ${item.clientTitle}.`,
      );
      await onUpdated();
    } catch (error) {
      showFailureToast(
        toast,
        "Removal failed",
        error,
        "Could not remove MCP server.",
      );
    }
  }, [item, onUpdated]);

  return (
    <List.Item
      id={`mcp:${item.client}:${item.id}`}
      icon={{ source: Icon.Network, tintColor: Color.Blue }}
      title={item.id}
      subtitle={isShowingDetail ? undefined : item.clientTitle}
      accessories={
        isShowingDetail ? [] : [{ tag: item.clientTitle }, { tag: "MCP" }]
      }
      detail={
        <List.Item.Detail
          markdown={`# ${item.id}\n\nInstalled MCP server in **${item.clientTitle}**.`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Type" text="MCP Server" />
              <List.Item.Detail.Metadata.Label
                title="Client"
                text={item.clientTitle}
              />
              <List.Item.Detail.Metadata.Label
                title="Client Key"
                text={item.client}
              />
              {summaryLoading ? (
                <List.Item.Detail.Metadata.Label
                  title="Server Stats"
                  text="Loading..."
                />
              ) : null}
              {summary ? (
                <List.Item.Detail.Metadata.TagList title="Verified">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={summary.verified ? "Yes" : "No"}
                    color={summary.verified ? Color.Green : Color.Red}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {summary ? (
                <List.Item.Detail.Metadata.Label
                  title="Connection"
                  text={summary.remote ? "Remote" : "Local"}
                />
              ) : null}
              {uses ? (
                <List.Item.Detail.Metadata.Label title="Uses" text={uses} />
              ) : null}
              {score ? (
                <List.Item.Detail.Metadata.TagList title="Score">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={score}
                    color={scoreToColor(summary?.score)}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {summary?.isDeployed !== undefined ? (
                <List.Item.Detail.Metadata.TagList title="Deployed">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={summary.isDeployed ? "Yes" : "No"}
                    color={summary.isDeployed ? Color.Green : Color.Orange}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {createdDate ? (
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={createdDate}
                />
              ) : null}
              <List.Item.Detail.Metadata.Link
                title="View on Smithery"
                text={item.id}
                target={serverUrl}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Remove Command"
                text={removeCommand}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Uninstall from Client"
            icon={Icon.Trash}
            onAction={handleRemove}
          />
          <Action.CopyToClipboard
            title="Copy Remove Command"
            content={removeCommand}
          />
          <Action.OpenInBrowser title="Open on Smithery" url={serverUrl} />
          <Action
            title={isShowingDetail ? "Hide Detail Panel" : "Show Detail Panel"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
        </ActionPanel>
      }
    />
  );
}
