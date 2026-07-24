import { Action, ActionPanel, Icon, List } from "@raycast/api";

import CreateIssueForm from "./CreateIssueForm";

export function IssueListEmptyView() {
  return (
    <List.EmptyView
      title="No issues found"
      description="How about creating one?"
      actions={
        <ActionPanel>
          <Action.Push title="Create Issue" icon={Icon.Plus} target={<CreateIssueForm enableDrafts={false} />} />
        </ActionPanel>
      }
    />
  );
}
