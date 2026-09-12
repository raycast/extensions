import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { PullRequestForm } from "../create-pull-request";
import { getErrorMessage } from "../helpers/errors";

export default function PullRequestListEmptyView({ error }: { error?: unknown }) {
  if (error) {
    return (
      <List.EmptyView icon={Icon.Warning} title="Failed to Load Pull Requests" description={getErrorMessage(error)} />
    );
  }

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
