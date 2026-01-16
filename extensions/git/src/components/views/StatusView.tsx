import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useGitDiff } from "../../hooks/useGitDiff";
import { FileManagerActions } from "../actions/FileActions";
import { FileStatusIcon } from "../icons/StatusIcons";
import { StashCreateAction } from "../actions/StashActions";
import { FileStatus, StatusMode } from "../../types";
import { useMemo, useState } from "react";
import { existsSync } from "fs";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import { PatchApplyAction, PatchCreateAction } from "../actions/PatchActions";
import {
  CommitChangesAction,
  ConflictAbortAction,
  FileAttachedLinksAction,
  FileDiscardAction,
  FileDiscardAllAction,
  FileResolveConflictAction,
  FileStageAction,
  FileStageAllAction,
  FileUnstageAction,
  FileUnstageAllAction,
} from "../actions/StatusActions";
import { FileHistoryAction } from "./FileHistoryView";
import { ToggleDetailAction, ToggleDetailController, useToggleDetail } from "../actions/ToggleDetailAction";
import { basename } from "path";
import { BranchAttachedLinksAction, BranchPushAction, BranchPushForceAction } from "../actions/BranchActions";
import { RemoteFetchAction, RemotePullAction } from "../actions/RemoteActions";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";

export function StatusView(context: RepositoryContext & NavigationContext) {
  const toggleController = useToggleDetail("Status Diff", "Changes", true);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const stagedFiles = useMemo(
    () => context.status.data.files.filter((f) => f.status === "staged"),
    [context.status.data.files],
  );
  const unstagedFiles = useMemo(
    () => context.status.data.files.filter((f) => f.status === "unstaged" || f.status === "untracked"),
    [context.status.data.files],
  );

  const navigationTitle = useMemo(() => {
    switch (context.status.data.mode.kind) {
      case "rebase":
        return `⚠️ Rebase ${context.status.data.mode.conflict ? "Conflict" : "Progress"} (${context.status.data.mode.current}/${context.status.data.mode.total})`;
      case "merge":
        return `⚠️ Merge Conflict`;
      case "squash":
        return `Squashing Commit`;
      case "cherryPick":
        return `⚠️ Cherry Pick Conflict`;
      case "revert":
        return `⚠️ Revert Conflict`;
      case "regular":
        return context.gitManager.repoName;
    }
  }, [context.status.data.mode.kind]);

  return (
    <List
      isLoading={context.status.isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search files by name, path..."
      onSelectionChange={(id) => setSelectedFilePath(id)}
      filtering={{ keepSectionOrder: true }}
      isShowingDetail={toggleController.isShowingDetail}
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
    >
      {context.status.error ? (
        <List.EmptyView
          title="Error loading status"
          description={context.status.error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <RefreshStatusAction {...context} />
              </ActionPanel.Section>

              <ToggleDetailAction controller={toggleController} />
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : !context.status.isLoading && context.status.data.files.length === 0 ? (
        <List.EmptyView
          {...emptyViewProperties(context.status.data.mode.kind)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <RefreshStatusAction {...context} />
              </ActionPanel.Section>
              <ToggleDetailAction controller={toggleController} />

              <ActionPanel.Section title="Patch">
                <PatchApplyAction {...context} />
              </ActionPanel.Section>

              {context.status.data && <ConflictAbortAction {...context} />}

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
                {context.branches.data.currentBranch && (
                  <BranchAttachedLinksAction {...context} branch={context.branches.data.currentBranch} />
                )}
              </ActionPanel.Section>

              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {unstagedFiles.length > 0 && (
            <List.Section title="Unstaged Files" subtitle={`${unstagedFiles.length}`}>
              {unstagedFiles.map((file) => (
                <FileListItem
                  key={file.absolutePath}
                  file={file}
                  toggleController={toggleController}
                  selectedFilePath={selectedFilePath}
                  {...context}
                />
              ))}
            </List.Section>
          )}

          {stagedFiles.length > 0 && (
            <List.Section title="Staged Files" subtitle={`${stagedFiles.length}`}>
              {stagedFiles.map((file) => (
                <FileListItem
                  key={file.absolutePath}
                  file={file}
                  toggleController={toggleController}
                  selectedFilePath={selectedFilePath}
                  {...context}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function FileListItem(
  context: NavigationContext &
    RepositoryContext & {
      file: FileStatus;
      selectedFilePath: string | null;
      toggleController: ToggleDetailController;
    },
) {
  // Create a unique identifier for each file item
  const fileId = `${context.file.relativePath}-${context.file.status}`;

  // Only load diff if this file is selected and detail view is showing
  const isFocused = context.toggleController.isShowingDetail && context.selectedFilePath === fileId;

  const { diff, isLoading, error } = useGitDiff({
    gitManager: context.gitManager,
    options: { file: context.file.relativePath, status: context.file.status },
    execute: isFocused,
  });

  const diffMarkdown = useMemo(() => {
    if (!isFocused) return undefined;

    const contentParts = [context.file.relativePath];

    if (isLoading) {
      contentParts.push("Loading...");
    }

    if (diff) {
      contentParts.push(diff);
    } else if (error) {
      contentParts.push("Error loading diff", `~~~\n${error.message}\n~~~`);
    } else if (context.file.isConflicted) {
      const currentSource = context.file.status === "staged" ? "local version" : "remote version";
      const otherSource = context.file.status === "staged" ? "remote version" : "local version";

      switch (context.file.type) {
        case "deleted":
          contentParts.push(
            `~~~\n⚠️ File was deleted in ${currentSource} but added or modified in ${otherSource}\n~~~`,
          );
          break;
        case "added":
          contentParts.push(
            `~~~\n⚠️ File was added in ${currentSource} but deleted or modified in ${otherSource}\n~~~`,
          );
          break;
        case "modified":
          contentParts.push(
            `~~~\n⚠️ File was modified in ${currentSource} but deleted or added in ${otherSource}\n~~~`,
          );
          break;
      }
    }

    if (context.file.isConflicted) {
      contentParts.push(
        "\n\n > 💡 **Tips**: \n > - Resolve the conflict manually by running `Resolve Conflicts` action.",
      );
    }

    return contentParts.join("\n\n");
  }, [context.file, diff, isLoading, error, isFocused]);

  return (
    <List.Item
      id={fileId}
      title={basename(context.file.absolutePath)}
      subtitle={
        context.toggleController.isShowingDetail
          ? undefined
          : {
              value: context.file.relativePath,
              tooltip: context.file.relativePath,
            }
      }
      icon={FileStatusIcon(context.file)}
      keywords={[context.file.absolutePath, context.file.relativePath, context.file.oldPath].filter(
        (keyword): keyword is string => Boolean(keyword),
      )}
      detail={<List.Item.Detail isLoading={isLoading} markdown={diffMarkdown} metadata />}
      quickLook={
        existsSync(context.file.absolutePath)
          ? { path: context.file.absolutePath, name: context.file.relativePath }
          : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title={basename(context.file.absolutePath)}>
            {/* Actions for staged files */}
            {context.file.status === "staged" && (
              <>
                <FileUnstageAction {...context} />
                <ToggleDetailAction controller={context.toggleController} />
                <FileManagerActions filePath={context.file.absolutePath} />
                <CopyToClipboardMenuAction
                  contents={[
                    { title: "Relative Path", content: context.file.relativePath, icon: Icon.Document },
                    { title: "Absolute Path", content: context.file.absolutePath, icon: Icon.Document },
                  ]}
                />
              </>
            )}

            {/* Actions for unstaged/untracked files */}
            {(context.file.status === "unstaged" || context.file.status === "untracked") && (
              <>
                {context.file.isConflicted && <FileResolveConflictAction {...context} />}
                <FileStageAction {...context} />
                <ToggleDetailAction controller={context.toggleController} />
                <FileManagerActions filePath={context.file.absolutePath} />
                <CopyToClipboardMenuAction
                  contents={[
                    { title: "Relative Path", content: context.file.relativePath, icon: Icon.Document },
                    { title: "Absolute Path", content: context.file.absolutePath, icon: Icon.Document },
                  ]}
                />
                {!context.file.isConflicted && <FileDiscardAction {...context} />}
              </>
            )}
            <FileHistoryAction filePath={context.file.absolutePath} {...context} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {context.branches.data.currentBranch && <CommitChangesAction {...context} />}
            <ConflictAbortAction {...context} />
            <FileStageAllAction {...context} />
            <FileUnstageAllAction {...context} />
            <FileDiscardAllAction {...context} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Patch">
            <PatchCreateAction {...context} />
            <PatchApplyAction {...context} />
          </ActionPanel.Section>

          <StashCreateAction {...context} />

          <ActionPanel.Section title="History">
            <RemotePullAction {...context} />
            {context.branches.data.currentBranch?.type === "current" && (
              <>
                <BranchPushAction branch={context.branches.data.currentBranch} {...context} />
                <BranchPushForceAction branch={context.branches.data.currentBranch} {...context} />
              </>
            )}
            <RemoteFetchAction {...context} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <FileAttachedLinksAction {...context} filePath={context.file.relativePath} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Workspace">
            <RefreshStatusAction {...context} />
          </ActionPanel.Section>

          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

function RefreshStatusAction(context: RepositoryContext) {
  return (
    <Action
      title="Refresh"
      onAction={context.status.revalidate}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}

function emptyViewProperties(kind: StatusMode["kind"]): Pick<List.EmptyView.Props, "icon" | "title" | "description"> {
  switch (kind) {
    case "regular":
      return {
        icon: Icon.NewDocument,
        title: "No changes",
        description: "No changes in the repository. The working directory is clean.",
      };
    case "merge":
      return {
        icon: { source: `git - merge.svg`, tintColor: Color.Yellow },
        title: "Merge Conflict",
        description: 'Please run "Commit Merge" action to finish.',
      };
    case "squash":
      return {
        icon: { source: `arrow - bounce.svg`, tintColor: Color.Yellow },
        title: "Squash Conflict",
        description: 'Please run "Commit Squash" action to finish.',
      };
    case "cherryPick":
      return {
        icon: { source: Icon.ExclamationMark, tintColor: Color.Yellow },
        title: "Cherry Pick Conflict",
        description: 'Please run "Continue Cherry Pick" action to finish.',
      };
    case "revert":
      return {
        icon: { source: Icon.ArrowCounterClockwise, tintColor: Color.Yellow },
        title: "Revert Conflict",
        description: 'Please run "Continue Revert" action to finish.',
      };
    case "rebase":
      return {
        icon: { source: `arrow - rebase.svg`, tintColor: Color.Yellow },
        title: "Rebase Progress",
        description: 'Please run "Continue Rebase" action to finish.',
      };
  }
}
