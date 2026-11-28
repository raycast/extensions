import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { Issue } from "../api/classroom";
import { escapeMarkdown } from "../helpers/formatters";
import RefreshAction from "./RefreshAction";

// Lists what couldn't be loaded, so that a failure isn't mistaken for there being nothing
export default function IssuesSection({ issues, onRefresh }: { issues: Issue[]; onRefresh: () => void }) {
  if (issues.length === 0) return null;

  return (
    <List.Section title="Couldn't Load" subtitle={String(issues.length)}>
      {issues.map(({ id, title, message }) => (
        <List.Item
          key={id}
          title={title}
          subtitle={message}
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          detail={
            <List.Item.Detail
              markdown={`# ${escapeMarkdown(title)}\n\n${message}\n\nEverything else is up to date. Refresh to try again.`}
            />
          }
          actions={
            <ActionPanel>
              <RefreshAction onRefresh={onRefresh} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
