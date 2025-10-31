import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { StashApplyAction, StashDropAction, StashRenameAction } from "../actions/StashActions";
import "../../utils/date-utils";
import { Stash } from "../../types";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";

export function StashesView(context: RepositoryContext & NavigationContext) {
  return (
    <List
      isLoading={context.stashes.isLoading}
      navigationTitle={context.gitManager.repoName}
      searchBarPlaceholder="Search stashes by message, author..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      actions={
        <ActionPanel>
          <RefreshStashesAction {...context} />
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    >
      {!context.stashes.isLoading && context.stashes.data.length === 0 ? (
        <List.EmptyView title="No stashes" description="No saved changes in the stash." icon={Icon.Bookmark} />
      ) : (
        context.stashes.data.map((stash, index) => (
          <StashListItem key={index} stash={stash} index={index} {...context} />
        ))
      )}
    </List>
  );
}

function StashListItem(
  context: RepositoryContext &
    NavigationContext & {
      stash: Stash;
      index: number;
    },
) {
  return (
    <List.Item
      title={context.stash.message}
      accessories={[
        {
          text: context.stash.date.toRelativeDateString(),
          tooltip: Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
            context.stash.date,
          ),
        },
      ]}
      keywords={[context.stash.hash, context.stash.author, context.stash.authorEmail].filter(Boolean)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <StashApplyAction {...context} />
            <StashRenameAction {...context} />
            <StashDropAction {...context} />
          </ActionPanel.Section>
          <RefreshStashesAction {...context} />
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

function RefreshStashesAction(context: RepositoryContext & NavigationContext) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={context.stashes.revalidate}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}
