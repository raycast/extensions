import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { SmitheryServer } from "../../api/types";
import { buildMcpInstallTemplate } from "../../constants/commands";
import { buildMcpServerUrl } from "../../constants/urls";
import {
  formatCompactNumber,
  formatDate,
  formatScoreOutOf100,
  scoreToColor,
} from "../../utils/format";
import { getSmitheryExecutable } from "../../utils/smithery";
import { McpInstallForm } from "./McpInstallForm";
import { McpServerDetail } from "./McpServerDetail";

type McpListItemProps = {
  server: SmitheryServer;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
};

function InlineDetail({ server }: { server: SmitheryServer }) {
  const installTemplate = buildMcpInstallTemplate(
    server.qualifiedName,
    getSmitheryExecutable(),
  );
  const serverUrl = buildMcpServerUrl(server.qualifiedName);
  const uses = formatCompactNumber(server.useCount);
  const score = formatScoreOutOf100(server.score);
  const createdDate = formatDate(server.createdAt);
  const markdown = `# ${server.displayName}

${server.description ?? "No description available."}

Install this MCP server directly from Raycast or copy the install command.
`;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Qualified Name"
            text={server.qualifiedName}
          />
          <List.Item.Detail.Metadata.TagList title="Verified">
            <List.Item.Detail.Metadata.TagList.Item
              text={server.verified ? "Yes" : "No"}
              color={server.verified ? Color.Green : Color.Red}
            />
          </List.Item.Detail.Metadata.TagList>
          {score ? (
            <List.Item.Detail.Metadata.TagList title="Score">
              <List.Item.Detail.Metadata.TagList.Item
                text={score}
                color={scoreToColor(server.score)}
              />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Connection"
            text={server.remote ? "Remote" : "Local"}
          />
          {server.isDeployed !== undefined ? (
            <List.Item.Detail.Metadata.TagList title="Deployed">
              <List.Item.Detail.Metadata.TagList.Item
                text={server.isDeployed ? "Yes" : "No"}
                color={server.isDeployed ? Color.Green : Color.Orange}
              />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {uses ? (
            <List.Item.Detail.Metadata.Label
              title="Uses"
              text={uses}
              icon={Icon.Download}
            />
          ) : null}
          {createdDate ? (
            <List.Item.Detail.Metadata.Label
              title="Created"
              text={createdDate}
            />
          ) : null}
          <List.Item.Detail.Metadata.Link
            title="View on Smithery"
            text={server.qualifiedName}
            target={serverUrl}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Install Command"
            text={installTemplate}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function McpListItem({
  server,
  isShowingDetail,
  onToggleDetail,
}: McpListItemProps) {
  const accessories: List.Item.Accessory[] = [];
  const compactUses = formatCompactNumber(server.useCount);

  if (compactUses) {
    accessories.push({ text: compactUses, tooltip: "Use count" });
  }

  accessories.push({
    tag: server.remote ? "Remote" : "Local",
    tooltip: "Connection type",
  });

  if (server.verified) {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: "Verified",
    });
  }

  const serverUrl = buildMcpServerUrl(server.qualifiedName);
  const installTemplate = buildMcpInstallTemplate(
    server.qualifiedName,
    getSmitheryExecutable(),
  );

  return (
    <List.Item
      title={server.displayName}
      subtitle={isShowingDetail ? undefined : server.description}
      accessories={isShowingDetail ? [] : accessories}
      id={server.qualifiedName}
      detail={<InlineDetail server={server} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add to Client"
            icon={Icon.Plus}
            target={
              <McpInstallForm
                qualifiedName={server.qualifiedName}
                displayName={server.displayName}
              />
            }
          />
          <Action.Push
            title="View Details"
            icon={Icon.Sidebar}
            target={<McpServerDetail qualifiedName={server.qualifiedName} />}
          />
          <Action
            title={isShowingDetail ? "Hide Detail Panel" : "Show Detail Panel"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={installTemplate}
          />
          <Action.OpenInBrowser title="Open on Smithery" url={serverUrl} />
        </ActionPanel>
      }
    />
  );
}
