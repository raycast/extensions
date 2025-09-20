import { Action, ActionPanel, List } from "@raycast/api";

import { PullRequestForm } from "../create-pull-request";

export default function PullRequestListEmptyView() {
  return (
    <List.EmptyView
      title="No pull requests found"
      actions={
        <ActionPanel>
          <Action.Push title="Create Pull Request" target={<PullRequestForm />} />
        </ActionPanel>
      }
    />
  );
}
