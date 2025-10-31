import { ActionPanel, List, Icon, Action, Color, Image } from "@raycast/api";
import {
  CommitCheckoutAction,
  CommitCherryPickAction,
  CommitRevertAction,
  CommitResetAction,
  CommitInteractiveRebaseAction,
  CommitPatchCreateAction,
  CommitRewordAction,
  CommitRebaseAction,
  CommitAttachedLinksAction,
} from "../actions/CommitActions";
import { TagCreateAction, TagRemoveAction, TagRenameAction } from "../actions/TagActions";
import { BranchPushAction, BranchPushForceAction } from "../actions/BranchActions";
import { CommitDetailsView } from "./CommitDetailsView";
import { useIssueTracker, replaceUrlPatternsWithLinks } from "../../hooks/useIssueTracker";
import "../../utils/date-utils";
import { Branch, Commit, IssueTrackerConfig } from "../../types";
import { useMemo, useState } from "react";
import { RemoteHostIcon, RemoteHostProviderIcon } from "../icons/RemoteHostIcons";
import { RemoteFetchAction, RemotePullAction } from "../actions/RemoteActions";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import { ToggleDetailAction, ToggleDetailController, useToggleDetail } from "../actions/ToggleDetailAction";
import { basename } from "path";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";

export function CommitsView(context: RepositoryContext & NavigationContext) {
  const toggleDetailController = useToggleDetail("Commits-Detail", "Detail", false);
  const toggleMetadataController = useToggleDetail("Commits-Metadata", "Metadata", true);
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);

  // Load URL tracker configurations once for the entire view
  const { configs: IssueTrackerConfigs, findUrls } = useIssueTracker();

  return (
    <List
      isLoading={context.commits.isLoading}
      pagination={context.commits.pagination}
      navigationTitle={context.gitManager.repoName}
      searchBarPlaceholder="Search commits by message, sha, author, tags, files..."
      selectedItemId={selectedCommitId || undefined}
      isShowingDetail={toggleDetailController.isShowingDetail}
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
    >
      {context.commits.error ? (
        <List.EmptyView
          title="Error loading commits"
          description={context.commits.error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <SharedActionsSection
                toggleDetailController={toggleDetailController}
                toggleMetadataController={toggleMetadataController}
                {...context}
              />
            </ActionPanel>
          }
        />
      ) : !context.commits.isLoading && context.commits.data.length === 0 ? (
        <List.EmptyView
          title="No commits"
          description="No commits in this branch."
          icon={`git-commit.svg`}
          actions={
            <ActionPanel>
              <SharedActionsSection
                toggleDetailController={toggleDetailController}
                toggleMetadataController={toggleMetadataController}
                {...context}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={getBranchFilterDisplayName(context)}>
          {context.commits.data.map((commit, index) => (
            <CommitListItem
              key={commit.hash}
              commit={commit}
              index={index}
              toggleDetailController={toggleDetailController}
              toggleMetadataController={toggleMetadataController}
              issueTrackerConfigs={IssueTrackerConfigs}
              findUrls={findUrls}
              onMoveToCommit={setSelectedCommitId}
              {...context}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CommitListItem(
  context: NavigationContext &
    RepositoryContext & {
      commit: Commit;
      index: number;
      toggleDetailController: ToggleDetailController;
      toggleMetadataController: ToggleDetailController;
      issueTrackerConfigs: IssueTrackerConfig[];
      findUrls: (message: string) => { title: string; url: string }[];
      onMoveToCommit: (commitHash: string) => void;
    },
) {
  const icon: Image.ImageLike | undefined = useMemo(() => {
    if (
      context.commits.selectedBranch &&
      context.commits.selectedBranch.kind === "branch" &&
      context.commits.selectedBranch.ahead
    ) {
      if (context.commits.selectedBranch.ahead > context.index) {
        return { source: Icon.Dot, tintColor: Color.Orange, tooltip: "Unpushed" };
      }
    }
    return undefined;
  }, [context.commits.selectedBranch, context.index]);

  // Prepare accessories based on filter and detail view state
  const accessories: List.Item.Accessory[] = useMemo(() => {
    if (context.toggleDetailController.isShowingDetail) {
      return [];
    }
    const accessoryItems: List.Item.Accessory[] = [];

    // Handle tags - show maximum 1 tag
    if (context.commit.tags.length > 0) {
      let title = context.commit.tags[0];
      let tooltip: string | undefined = undefined;

      // Add remaining tags to remainingRefs
      if (context.commit.tags.length > 1) {
        title += ` (+${context.commit.tags.length - 1})`;
        tooltip = context.commit.tags.slice(1).join("\n");
      }

      accessoryItems.push({
        tag: { value: title, color: Color.Blue },
        tooltip: tooltip,
        icon: Icon.Tag,
      });
    }

    // Handle branches only when All branches filter is selected - show maximum 1 branch
    if (context.commits.filter.kind === "all") {
      let title: string | undefined = undefined;
      let tooltip: string | undefined = undefined;
      let color: Color = Color.SecondaryText;
      let icon: Image.ImageLike = Icon.Dot;

      const allCommitBranches = context.commit.localBranches.concat(
        context.commit.remoteBranches.map((branch) => branch.fullName),
      );

      if (context.commit.currentBranchName) {
        title = context.commit.currentBranchName;
        color = Color.Green;
        if (allCommitBranches.length > 0) {
          title += ` (+${allCommitBranches.length})`;
          tooltip = allCommitBranches.join("\n");
        }
      } else if (allCommitBranches.length > 0) {
        const firstBranch = allCommitBranches[0];
        title = firstBranch;
        if (allCommitBranches.length > 1) {
          title += ` (+${allCommitBranches.length - 1})`;
          tooltip = allCommitBranches.slice(1).join("\n");
        }

        if (context.commit.localBranches.length > 0) {
          icon = Icon.Dot;
        } else if (context.commit.remoteBranches.length > 0) {
          icon = RemoteHostIcon(context.remotes.data[context.commit.remoteBranches[0].remote]);
        }
      }

      if (title) {
        accessoryItems.push({
          tag: { value: title, color: color },
          tooltip: tooltip,
          icon: icon,
        });
      }
    }

    accessoryItems.push({
      text: { value: context.commit.author },
      tooltip: context.commit.authorEmail,
    });

    accessoryItems.push({
      text: context.commit.date.toRelativeDateString(),
      tooltip: Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(context.commit.date),
    });

    return accessoryItems;
  }, [
    context.toggleDetailController.isShowingDetail,
    context.commits.filter.kind,
    context.commit.tags,
    context.commit.localBranches,
    context.commit.remoteBranches,
    context.commit.currentBranchName,
  ]);

  const commitBodyMarkdown = useMemo(() => {
    return markdownifyCommitBody(context.commit, context.issueTrackerConfigs);
  }, [context.commit, context.issueTrackerConfigs]);

  return (
    <List.Item
      id={context.commit.hash}
      title={context.commit.message}
      icon={icon}
      accessories={accessories}
      keywords={[
        context.commit.hash,
        context.commit.shortHash,
        context.commit.body,
        ...context.commit.author.split(" "),
        context.commit.authorEmail,
        ...context.commit.tags,
        ...(context.commit.changedFiles?.map((fileChanges) => basename(fileChanges.path)) || []),
      ].filter((keyword): keyword is string => Boolean(keyword))}
      detail={
        <List.Item.Detail
          markdown={commitBodyMarkdown}
          metadata={
            context.toggleMetadataController.isShowingDetail ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Author" text={context.commit.author} />
                <List.Item.Detail.Metadata.Label title="Email" text={context.commit.authorEmail} />
                <List.Item.Detail.Metadata.Label title="Date" text={context.commit.date.toLocaleString()} />
                <List.Item.Detail.Metadata.Label title="Hash" text={context.commit.hash} />
                {/* Tags as TagList */}
                {context.commit.tags.length > 0 && (
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    {context.commit.tags.map((tag) => (
                      <List.Item.Detail.Metadata.TagList.Item key={tag} icon={Icon.Tag} text={tag} color={Color.Blue} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                )}
                {/* Branches as TagList */}
                {(context.commit.localBranches.length > 0 || context.commit.remoteBranches.length > 0) && (
                  <List.Item.Detail.Metadata.TagList title="Branches">
                    {context.commit.localBranches.map((branch) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={branch}
                        icon={Icon.Dot}
                        text={branch}
                        color={Color.SecondaryText}
                      />
                    ))}
                    {context.commit.remoteBranches.map((branch) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={branch.fullName}
                        icon={RemoteHostIcon(context.remotes.data[branch.remote])}
                        text={branch.fullName}
                        color={Color.SecondaryText}
                      />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                )}
              </List.Item.Detail.Metadata>
            ) : undefined
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Commit">
            <Action.Push title="Show Changes" icon={Icon.Document} target={<CommitDetailsView {...context} />} />
            {context.commit.currentBranchName && context.branches.data.currentBranch && (
              <CommitRewordAction {...context} />
            )}
            {!context.commit.currentBranchName && <CommitCheckoutAction {...context} />}
            <CommitCherryPickAction {...context} />
            <CommitResetAction {...context} />
            <CommitRevertAction {...context} />
            <CommitRebaseAction {...context} />
            <CommitInteractiveRebaseAction {...context} />
            <CommitPatchCreateAction {...context} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <CommitAttachedLinksAction {...context} />
            <CopyToClipboardMenuAction
              contents={[
                { title: "Commit Hash", content: context.commit.hash, icon: Icon.Hashtag },
                { title: "Short Hash", content: context.commit.shortHash, icon: Icon.Hashtag },
                { title: "Commit Message", content: context.commit.message, icon: Icon.Message },
                { title: "Author Name", content: context.commit.author, icon: Icon.Person },
                { title: "Author Email", content: context.commit.authorEmail, icon: Icon.Envelope },
                ...(context.commits.filter.kind === "branch"
                  ? [{ title: "Branch Name", content: context.commits.filter.value.name, icon: `git-branch.svg` }]
                  : []),
                ...(context.commit.currentBranchName
                  ? [
                      {
                        title: `Branch "${context.commit.currentBranchName}"`,
                        content: context.commit.currentBranchName,
                        icon: `git-branch.svg`,
                      },
                    ]
                  : []),
                ...context.commit.localBranches.map((branch) => ({
                  title: `Branch "${branch}"`,
                  content: branch,
                  icon: `git-branch.svg`,
                })),
                ...context.commit.remoteBranches.map((branch) => ({
                  title: `Branch "${branch.fullName}"`,
                  content: branch.fullName,
                  icon: `git-branch.svg`,
                })),
                ...context.commit.tags.map((tag) => ({ title: `Tag "${tag}"`, content: tag, icon: Icon.Tag })),
              ]}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Tags">
            {context.commit.tags.map((tag) => (
              <ActionPanel.Submenu key={`tag-${tag}`} title={`Tag ${tag}`} icon={Icon.Tag}>
                <TagRenameAction tagName={tag} {...context} />
                <TagRemoveAction tagName={tag} {...context} />
              </ActionPanel.Submenu>
            ))}
            <TagCreateAction {...context} ref={context.commit.hash} />
          </ActionPanel.Section>

          <SharedActionsSection {...context} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Helper function to get display name for the current filter
 */
function getBranchFilterDisplayName(context: RepositoryContext & NavigationContext): string | undefined {
  if (!context.commits.selectedBranch) {
    return undefined;
  }

  if ("commitHash" in context.commits.selectedBranch) {
    return `Commits on HEAD '${context.commits.selectedBranch.shortCommitHash}'`;
  }
  if ("displayName" in context.commits.selectedBranch) {
    const parts = [];
    if (context.commits.selectedBranch.ahead) parts.push(`↑ ${context.commits.selectedBranch.ahead} ahead`);
    if (context.commits.selectedBranch.behind) parts.push(`↓ ${context.commits.selectedBranch.behind} behind`);

    return `Filtered by '${context.commits.selectedBranch.displayName}' branch ${parts.length > 0 ? ` • ${parts.join(" • ")}` : ""}`;
  }
  return undefined;
}

function SharedActionsSection(
  context: RepositoryContext &
    NavigationContext & {
      toggleDetailController: ToggleDetailController;
      toggleMetadataController: ToggleDetailController;
    },
) {
  return (
    <>
      <ActionPanel.Section>
        <ToggleDetailAction controller={context.toggleDetailController} />
        {context.toggleDetailController.isShowingDetail && (
          <ToggleDetailAction
            controller={context.toggleMetadataController}
            shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
          />
        )}
        {context.commits.filter && context.branches.data && <CommitBranchFilterAction {...context} />}
      </ActionPanel.Section>

      <ActionPanel.Section title="History">
        <RemotePullAction {...context} />
        {context.branches.data.currentBranch && context.branches.data.currentBranch.type === "current" && (
          <>
            <BranchPushAction branch={context.branches.data.currentBranch} {...context} />
            <BranchPushForceAction branch={context.branches.data.currentBranch} {...context} />
          </>
        )}
        <RemoteFetchAction {...context} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {context.commits.pagination?.hasMore && (
          <Action
            title="Load More Commits"
            onAction={context.commits.pagination.onLoadMore}
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          />
        )}
        <Action
          title="Refresh"
          onAction={() => {
            context.branches.revalidate();
            context.commits.revalidate();
          }}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel.Section>

      <WorkspaceNavigationActions {...context} />
    </>
  );
}

/**
 * Action submenu for filtering commits by branch.
 * Shows same structure as dropdown but in ActionPanel.Submenu format.
 */
function CommitBranchFilterAction(context: RepositoryContext) {
  return (
    <ActionPanel.Submenu title="Filter by Branch" icon={Icon.Filter} shortcut={{ modifiers: ["cmd"], key: "f" }}>
      <ActionPanel.Section>
        <Action
          title="All Branches"
          icon={context.commits.filter.kind === "all" ? Icon.Checkmark : Icon.List}
          autoFocus={context.commits.filter.kind === "all"}
          onAction={() => context.commits.setFilter({ kind: "all" })}
        />
      </ActionPanel.Section>

      {/* Current Branch / Detached HEAD Section */}
      <ActionPanel.Section title={context.branches.data.detachedHead ? "Detached HEAD" : "Current Branch"}>
        {context.branches.data.detachedHead && (
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case
            title={`HEAD (${context.branches.data.detachedHead.shortCommitHash})`}
            icon={context.commits.filter.kind === "current" ? Icon.Checkmark : Icon.Anchor}
            autoFocus={context.commits.filter.kind === "current"}
            onAction={() => context.commits.setFilter({ kind: "current", upstream: false })}
          />
        )}
        {context.branches.data.currentBranch && (
          <Action
            title={context.branches.data.currentBranch.displayName}
            icon={{
              source:
                context.commits.filter.kind === "current" && !context.commits.filter.upstream
                  ? Icon.Checkmark
                  : Icon.Dot,
              tintColor: Color.Green,
            }}
            autoFocus={context.commits.filter.kind === "current" && !context.commits.filter.upstream}
            onAction={() => context.commits.setFilter({ kind: "current", upstream: false })}
          />
        )}
      </ActionPanel.Section>

      {context.branches.data.currentBranch?.upstream && (
        <ActionPanel.Section title={"Upstream Branch"}>
          <Action
            title={context.branches.data.currentBranch.upstream.fullName}
            icon={
              context.commits.filter.kind === "current" && context.commits.filter.upstream
                ? { source: Icon.Checkmark }
                : RemoteHostProviderIcon(
                    context.remotes.data[context.branches.data.currentBranch.upstream.remote].provider,
                  )
            }
            autoFocus={context.commits.filter.kind === "current" && context.commits.filter.upstream}
            onAction={() => context.commits.setFilter({ kind: "current", upstream: true })}
          />
        </ActionPanel.Section>
      )}

      {/* Local Branches Section */}
      {context.branches.data.localBranches.length > 0 && (
        <ActionPanel.Section title="Local Branches">
          {context.branches.data.localBranches.map((branch) => (
            <BranchFilterAction key={branch.displayName} branch={branch} {...context} />
          ))}
        </ActionPanel.Section>
      )}

      {/* Remote Branches Sections */}
      {Object.entries(context.branches.data.remoteBranches).map(([remoteName, branches]) => (
        <ActionPanel.Section key={remoteName} title={`Remote: ${remoteName}`}>
          {branches.map((branch) => (
            <BranchFilterAction key={branch.displayName} branch={branch} {...context} />
          ))}
        </ActionPanel.Section>
      ))}
    </ActionPanel.Submenu>
  );
}

function BranchFilterAction(context: RepositoryContext & { branch: Branch }) {
  const isSelected =
    context.commits.selectedBranch &&
    "displayName" in context.commits.selectedBranch &&
    context.commits.selectedBranch?.displayName === context.branch.displayName;

  const icon: Image.ImageLike = useMemo(() => {
    let baseIcon: Image.ImageLike = Icon.Dot;
    switch (context.branch.type) {
      case "remote":
        baseIcon = RemoteHostProviderIcon(context.remotes.data[context.branch.remote!].provider);
        break;
      case "local":
        baseIcon = Icon.Dot;
        break;
    }

    return isSelected ? Icon.Checkmark : baseIcon;
  }, [isSelected]);

  return (
    <Action
      title={context.branch.displayName}
      icon={icon}
      autoFocus={isSelected}
      onAction={() =>
        context.commits.setFilter({
          kind: "branch",
          value: context.branch,
        })
      }
    />
  );
}

function markdownifyCommitBody(commit: Commit, issueTrackerConfigs: IssueTrackerConfig[]): string {
  // 1. Commit title (## heading) with URL patterns replaced by links
  const commitMessageWithLinks = replaceUrlPatternsWithLinks(commit.message, issueTrackerConfigs);
  let detail = `## ${commitMessageWithLinks}\n\n`;

  // 2. Rest of commit description (if exists)
  if (commit.body && commit.body.trim()) {
    detail += "\n\n";

    // Format commit body for markdown:
    // 1. Split by double newlines to preserve paragraphs
    // 2. Within each paragraph, replace single newlines with markdown line breaks (two spaces + newline)
    // 3. Escape markdown characters that should not be interpreted as formatting
    const formattedBody = commit.body
      .trim()
      // Split into paragraphs (separated by empty lines)
      .split(/\n\s*\n/)
      .map((paragraph) => {
        // Within each paragraph, convert single newlines to markdown line breaks
        return paragraph
          .trim()
          .split("\n")
          .map((line) => {
            // Escape markdown special characters
            const escapedLine = line.trim().replace(/[_#>+|~!]/g, "\\$&");
            return escapedLine;
          })
          .filter((line) => line.length > 0)
          .join("  \n"); // Two spaces + newline = markdown line break
      })
      .filter((paragraph) => paragraph.length > 0)
      .join("\n\n");

    detail += `${formattedBody}\n\n`;
  }

  return detail;
}
