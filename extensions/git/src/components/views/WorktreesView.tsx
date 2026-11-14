import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useMemo } from "react";
import { Worktree } from "../../types";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import {
  WorktreeCreateAction,
  WorktreeDeleteAction,
  WorktreeOpenAction,
  WorktreeQuickLinkAction,
} from "../actions/WorktreeActions";
import { RepositoryDirectoryActions } from "../actions/RepositoryDirectoryActions";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";

export default function WorktreesView(context: RepositoryContext & NavigationContext) {
  const currentWorktree = context.worktrees.data.find((worktree) => context.worktrees.isOpened(worktree));
  const mainWorktree = context.worktrees.data.find((worktree) => worktree.isMain);
  const linkedWorktrees = context.worktrees.data.filter(
    (worktree) => !worktree.isMain && !context.worktrees.isOpened(worktree),
  );
  const showMainSection = mainWorktree && !context.worktrees.isOpened(mainWorktree);

  return (
    <List
      isLoading={context.worktrees.isLoading}
      navigationTitle={context.gitManager.worktreeOrigin?.displayName ?? context.gitManager.repoName}
      searchBarPlaceholder="Search worktrees by name, path or branch..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      actions={
        <ActionPanel>
          <WorktreeCreateAction {...context} />
          <RefreshWorktreesAction {...context} />
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    >
      {context.worktrees.error ? (
        <List.EmptyView
          title="Error loading worktrees"
          description={context.worktrees.error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <WorktreeCreateAction {...context} />
              <RefreshWorktreesAction {...context} />
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : !context.worktrees.isLoading && context.worktrees.data.length === 0 ? (
        <List.EmptyView
          title="No worktrees"
          description="This repository has no worktrees."
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <WorktreeCreateAction {...context} />
              <RefreshWorktreesAction {...context} />
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {currentWorktree && (
            <List.Section title="Current Worktree">
              <WorktreeListItem key={currentWorktree.path} worktree={currentWorktree} {...context} />
            </List.Section>
          )}

          {showMainSection && mainWorktree && (
            <List.Section title="Main Worktree">
              <WorktreeListItem key={mainWorktree.path} worktree={mainWorktree} {...context} />
            </List.Section>
          )}

          {linkedWorktrees.length > 0 && (
            <List.Section title="Linked Worktrees">
              {linkedWorktrees.map((worktree) => (
                <WorktreeListItem key={worktree.path} worktree={worktree} {...context} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function WorktreeListItem(context: RepositoryContext & NavigationContext & { worktree: Worktree }) {
  const isOpened = context.worktrees.isOpened(context.worktree);

  const accessories: List.Item.Accessory[] = useMemo(() => {
    const result: List.Item.Accessory[] = [];

    if (isOpened) {
      result.push({
        tag: { value: "Current", color: Color.Green },
        tooltip: "Currently opened worktree",
      });
    }

    if (context.worktree.isLocked) {
      result.push({
        icon: Icon.Lock,
        tooltip: context.worktree.lockReason ? `Locked: ${context.worktree.lockReason}` : "Locked",
      });
    }

    if (context.worktree.isPrunable) {
      result.push({
        icon: Icon.ExclamationMark,
        tag: { value: "Prunable", color: Color.Yellow },
        tooltip: "Worktree directory is missing and can be pruned",
      });
    }

    if (context.worktree.branch) {
      result.push({
        icon: `git-branch.svg`,
        tag: { value: context.worktree.branch, color: Color.SecondaryText },
        tooltip: `Checked out branch '${context.worktree.branch}'`,
      });
    } else if (context.worktree.isDetached && context.worktree.head) {
      result.push({
        icon: Icon.Anchor,
        tag: { value: context.worktree.head.substring(0, 7), color: Color.SecondaryText },
        tooltip: "Detached HEAD",
      });
    }

    return result;
  }, [context.worktree, isOpened]);

  return (
    <List.Item
      id={context.worktree.path}
      title={context.worktree.name}
      icon={Icon.Layers}
      keywords={[context.worktree.path, context.worktree.branch].filter((keyword): keyword is string =>
        Boolean(keyword),
      )}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={context.worktree.name}>
            {!isOpened && <WorktreeOpenAction {...context} />}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <CopyToClipboardMenuAction
              contents={[{ title: "Directory Path", content: context.worktree.path, icon: Icon.Folder }]}
            />
            <WorktreeQuickLinkAction worktree={context.worktree} />
            <WorktreeDeleteAction {...context} />
          </ActionPanel.Section>

          <RepositoryDirectoryActions
            currentWorktreePath={context.worktree.path}
            repositoryRootPath={context.gitManager.repositoryRootPath}
          />

          <ActionPanel.Section title="Worktrees">
            <WorktreeCreateAction {...context} />
            <RefreshWorktreesAction {...context} />
          </ActionPanel.Section>

          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

function RefreshWorktreesAction(context: RepositoryContext) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={context.worktrees.revalidate}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
}
