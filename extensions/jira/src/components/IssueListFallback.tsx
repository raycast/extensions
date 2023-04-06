import { Action, ActionPanel, launchCommand, LaunchType, List } from "@raycast/api";

type IssueListFallbackProps = {
  query: string;
};

export default function IssueListFallback({ query }: IssueListFallbackProps) {
  function openSearchCommand() {
    return launchCommand({ name: "search-issues", type: LaunchType.UserInitiated, context: { query } });
  }

  return (
    <List.Section title="Commands">
      <List.Item
        title={`Search for "${query}"`}
        subtitle="Search Issues Globally"
        icon="icon.png"
        actions={
          <ActionPanel>
            <Action title="Open Command" onAction={openSearchCommand} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
