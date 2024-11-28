import { Action, ActionPanel, List } from "@raycast/api";

import { IssueForm } from "../create-issue";

export default function IssueListEmptyView() {
  return (
    <List.EmptyView
      title="No issues found"
      actions={
        <ActionPanel>
          <Action.Push title="Create Issue" target={<IssueForm />} />
        </ActionPanel>
      }
    />
  );
}
