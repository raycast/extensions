import { ActionPanel, Action, List, Icon, Color, Image } from "@raycast/api";
import {
  BranchCkeckoutAction,
  BranchDeleteAction,
  BranchPushAction,
  BranchMergeAction,
  BranchRebaseAction,
  BranchRenameAction,
  BranchCreateAction,
  BranchInteractiveRebaseAction,
  BranchPushForceAction,
  BranchShowCommitsAction,
  BranchAttachedLinksAction,
} from "../actions/BranchActions";
import { Branch, DetachedHead } from "../../types";
import { useMemo } from "react";
import { RemoteHostIcon, RemoteHostProviderIcon } from "../icons/RemoteHostIcons";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import { RemoteFetchAction, RemotePullAction } from "../actions/RemoteActions";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";
import { TagCreateAction } from "../actions/TagActions";

export function BranchesView(context: RepositoryContext & NavigationContext) {
  return (
    <List
      isLoading={context.branches.isLoading}
      navigationTitle={context.gitManager.repoName}
      searchBarPlaceholder="Search branches by name..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
    >
      {context.branches.error ? (
        <List.EmptyView
          title="Error loading branches"
          description={context.branches.error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Branches">
                <RefreshBranchesAction {...context} />
                <BranchCreateAction {...context} />
                <RemoteFetchAction {...context} />
              </ActionPanel.Section>
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : !context.branches.isLoading && !context.branches.data.currentBranch && !context.branches.data.detachedHead ? (
        <List.EmptyView
          title="No branches"
          description="No branches found in the repository."
          icon={`git-branch.svg`}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Branches">
                <BranchCreateAction {...context} />
                <RemoteFetchAction {...context} />
                <RefreshBranchesAction {...context} />
              </ActionPanel.Section>
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {/* Current Branch Section */}
          {context.branches.data.currentBranch && (
            <List.Section title="Current Branch">
              <BranchListItem
                key={context.branches.data.currentBranch.displayName}
                branch={context.branches.data.currentBranch}
                {...context}
              />
            </List.Section>
          )}

          {/* Detached HEAD Section */}
          {context.branches.data.detachedHead && (
            <List.Section title="Detached HEAD">
              <DetachedHeadListItem
                key={context.branches.data.detachedHead.shortCommitHash}
                detachedHead={context.branches.data.detachedHead}
                {...context}
              />
            </List.Section>
          )}

          {/* Local Branches Section */}
          {context.branches.data.localBranches.length > 0 && (
            <List.Section title="Local Branches">
              {context.branches.data.localBranches.map((branch) => (
                <BranchListItem key={branch.displayName} branch={branch} {...context} />
              ))}
            </List.Section>
          )}

          {/* Remote Branches Sections */}
          {Object.entries(context.branches.data.remoteBranches).map(([remoteName, remoteBranches]) => (
            <List.Section key={remoteName} title={remoteName} subtitle={context.remotes.data[remoteName]?.displayName}>
              {remoteBranches.map((branch) => (
                <BranchListItem key={branch.displayName} branch={branch} {...context} />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

function BranchListItem(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  const hasConflicts =
    context.branch.type === "current" && context.status.data?.files?.some((file) => file.isConflicted);

  const hasUncommittedChanges = context.branch.type === "current" && context.status.data?.files?.length !== 0;

  const accessories: List.Item.Accessory[] = useMemo(() => {
    const result = [];

    // Add conflict warning indicator for current branch
    if (context.branch.type === "current" && hasConflicts) {
      result.push({
        tag: { value: "Conflicts", color: Color.Red },
        icon: Icon.ExclamationMark,
        tooltip: "There are unresolved merge conflicts",
      });
    }

    // Add uncommitted changes indicator for current branch
    if (context.branch.type === "current" && hasUncommittedChanges && !hasConflicts) {
      result.push({
        tag: { value: "Uncommitted", color: Color.Orange },
        icon: Icon.Document,
        tooltip: "There are uncommitted changes",
      });
    }

    // Add ahead/behind indicators
    if (context.branch.ahead || context.branch.behind) {
      const parts = [];
      if (context.branch.ahead) parts.push(`${context.branch.ahead} ↑`);
      if (context.branch.behind) parts.push(`${context.branch.behind} ↓`);
      result.push({
        text: parts.join(" "),
        tooltip: [
          context.branch.ahead ? `↑ ahead by ${context.branch.ahead} commits` : null,
          context.branch.behind ? `↓ behind by ${context.branch.behind} commits` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    if ((context.branch.type === "local" || context.branch.type === "current") && context.branch.upstream) {
      result.push({
        tag: {
          value: context.branch.upstream.fullName,
          color: context.branch.isGone ? Color.Yellow : Color.SecondaryText,
        },
        tooltip: context.branch.isGone ? "Upstream was removed from remote" : "Tracked upstream",
        icon: context.branch.isGone
          ? Icon.ExclamationMark
          : RemoteHostIcon(context.remotes.data[context.branch.upstream!.remote]),
      });
    }

    return result;
  }, [context.branch, hasConflicts, hasUncommittedChanges]);

  // Determine icon based on branch type
  const icon: Image.ImageLike = useMemo(() => {
    if (context.branch.type === "current") {
      return { source: Icon.Dot, tintColor: Color.Green };
    } else if (context.branch.type === "remote") {
      return RemoteHostProviderIcon(context.remotes.data[context.branch.remote!].provider);
    } else {
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
    }
  }, [context.branch.type]);

  return (
    <List.Item
      key={context.branch.name}
      title={context.branch.displayName}
      icon={icon}
      accessories={accessories}
      keywords={[context.branch.upstream?.fullName, context.branch.remote].filter((keyword): keyword is string =>
        Boolean(keyword),
      )}
      actions={
        <ActionPanel>
          {/* Actions for current branch */}
          {context.branch.type === "current" && (
            <>
              <ActionPanel.Section title={context.branch.displayName}>
                <RemotePullAction {...context} />
                <BranchShowCommitsAction {...context} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <BranchPushAction {...context} />
                <BranchPushForceAction {...context} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <BranchRenameAction {...context} />
                <CopyToClipboardMenuAction
                  contents={[
                    { title: "Branch Name", content: context.branch.displayName, icon: icon },
                    ...(context.branch.upstream
                      ? [
                          {
                            title: "Upstream Name",
                            content: context.branch.upstream.fullName,
                            icon: RemoteHostIcon(context.remotes.data[context.branch.upstream.remote]),
                          },
                        ]
                      : []),
                  ]}
                />
                <BranchAttachedLinksAction {...context} />
              </ActionPanel.Section>
            </>
          )}

          {/* Actions for local branches */}
          {context.branch.type === "local" && (
            <>
              <ActionPanel.Section title={context.branch.displayName}>
                <BranchCkeckoutAction {...context} />
                <BranchShowCommitsAction {...context} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <BranchPushAction {...context} />
                <BranchPushForceAction {...context} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <BranchRebaseAction {...context} />
                <BranchInteractiveRebaseAction {...context} />
                <BranchMergeAction {...context} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <BranchRenameAction {...context} />
                <CopyToClipboardMenuAction
                  contents={[
                    { title: "Branch Name", content: context.branch.displayName, icon: icon },
                    ...(context.branch.upstream
                      ? [
                          {
                            title: "Upstream Name",
                            content: context.branch.upstream.fullName,
                            icon: RemoteHostIcon(context.remotes.data[context.branch.upstream.remote]),
                          },
                        ]
                      : []),
                  ]}
                />
                <BranchAttachedLinksAction {...context} />
                <BranchDeleteAction {...context} />
              </ActionPanel.Section>
            </>
          )}

          {/* Actions for remote branches */}
          {context.branch.type === "remote" && (
            <>
              <ActionPanel.Section title={context.branch.displayName}>
                <BranchCkeckoutAction {...context} />
                <BranchShowCommitsAction {...context} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <BranchPushAction {...context} />
                <BranchPushForceAction {...context} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <CopyToClipboardMenuAction contents={[{ title: "Branch Name", content: context.branch.displayName }]} />
                <BranchDeleteAction {...context} />
              </ActionPanel.Section>
            </>
          )}

          <ActionPanel.Section></ActionPanel.Section>

          <ActionPanel.Section>
            <BranchCreateAction {...context} />
            <TagCreateAction
              {...context}
              ref={context.branch.displayName}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Branches">
            <RemoteFetchAction {...context} />
            <RefreshBranchesAction {...context} />
          </ActionPanel.Section>

          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

function DetachedHeadListItem(context: RepositoryContext & NavigationContext & { detachedHead: DetachedHead }) {
  const hasConflicts = context.status.data?.files?.some((file) => file.isConflicted);
  const hasUncommittedChanges = context.status.data?.files?.length !== 0;

  const accessories: List.Item.Accessory[] = useMemo(() => {
    const result: List.Item.Accessory[] = [];

    if (hasConflicts) {
      result.push({
        icon: { source: Icon.ExclamationMark },
        tag: { value: "Conflicts", color: Color.Red },
        tooltip: "Conflicts",
      });
    }

    if (hasUncommittedChanges && !hasConflicts) {
      result.push({
        icon: { source: Icon.Dot, tintColor: Color.Orange },
        tag: { value: "Uncommitted", color: Color.Orange },
        tooltip: "Uncommitted changes",
      });
    }
    return result;
  }, [context.detachedHead, hasUncommittedChanges, hasConflicts]);

  return (
    <List.Item
      key={context.detachedHead.shortCommitHash}
      title={`HEAD (${context.detachedHead.shortCommitHash})`}
      subtitle={context.detachedHead.commitMessage}
      icon={{ source: Icon.Anchor }}
      accessories={accessories}
      keywords={[context.detachedHead.commitHash]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Branches">
            <BranchCreateAction {...context} />
            <RemoteFetchAction {...context} />
            <RefreshBranchesAction {...context} />
          </ActionPanel.Section>
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

function RefreshBranchesAction(context: RepositoryContext & NavigationContext) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={context.branches.revalidate}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}
