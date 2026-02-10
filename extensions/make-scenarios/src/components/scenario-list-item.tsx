import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { ScenarioItem } from "../api/types.js";
import { buildScenarioUrl, zoneLabel } from "../utils/url.js";

export function ScenarioListItem({
  item,
  onRefresh,
}: {
  item: ScenarioItem;
  onRefresh: () => void;
}) {
  const { scenario, team, org, folder, webhookUrl } = item;
  const url = buildScenarioUrl(org.zone, team.id, scenario.id);
  const isActive = !scenario.isPaused;

  const subtitle = folder ? `${team.name} / ${folder.name}` : team.name;

  return (
    <List.Item
      title={scenario.name}
      subtitle={subtitle}
      icon={{
        source: isActive ? Icon.CircleFilled : Icon.CircleDisabled,
        tintColor: isActive ? Color.Green : Color.SecondaryText,
      }}
      accessories={[
        { text: org.name },
        { tag: { value: zoneLabel(org.zone), color: Color.Blue } },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Make.com" url={url} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={url}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {webhookUrl && (
            <Action.CopyToClipboard
              title="Copy Webhook URL"
              content={webhookUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}
