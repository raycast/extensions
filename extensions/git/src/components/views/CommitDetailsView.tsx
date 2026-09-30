import { ActionPanel, Action, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useGitDiff } from "../../hooks/useGitDiff";
import { Commit, CommitFileChange, FileChangeStats } from "../../types";
import { FileManagerActions } from "../actions/FileActions";
import { CommitFileIcon } from "../icons/StatusIcons";
import { useState, useMemo } from "react";
import { usePromise } from "@raycast/utils";
import { existsSync } from "fs";
import { basename, join } from "path";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { WorkspaceNavigationActions } from "../actions/WorkspaceNavigationActions";
import { FileAttachedLinksAction, FileRestoreAction } from "../actions/StatusActions";
import { FileHistoryAction } from "./FileHistoryView";
import { ToggleDetailAction, ToggleDetailController, useToggleDetail } from "../actions/ToggleDetailAction";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";
import { GitLFSAction } from "../actions/GitLFSAction";
import { GitIgnoreAction } from "../actions/GitIgnoreAction";

export function CommitDetailsView(
  context: RepositoryContext &
    NavigationContext & {
      index: number;
      onMoveToCommit: (commitHash: string) => void;
    },
) {
  const [currentIndex, setCurrentIndex] = useState(context.index);
  const toggleController = useToggleDetail("Commit Details", "Diff", true);

  const switchToCommit = async (direction: "next" | "previous") => {
    let nextIndex = currentIndex;
    switch (direction) {
      case "previous":
        nextIndex = currentIndex + 1;
        break;
      case "next":
        nextIndex = currentIndex - 1;
        break;
    }

    if (nextIndex < 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No more commits",
        message: "This is the last commit in the repository.",
      });
      return;
    }

    if (nextIndex >= context.commits.data.length) {
      context.commits.pagination?.onLoadMore();

      if (!context.commits.pagination?.hasMore) {
        showToast({
          style: Toast.Style.Failure,
          title: "No more commits",
          message: "This is the last commit in the repository.",
        });
        return;
      }

      switchToCommit(direction);
      return;
    }

    setCurrentIndex(nextIndex);
    context.onMoveToCommit?.(context.commits.data[nextIndex].hash);
  };

  return (
    <ConcreteCommitView
      {...context}
      commit={context.commits.data[currentIndex]}
      toggleController={toggleController}
      onMoveToCommit={switchToCommit}
    />
  );
}

export function ConcreteCommitView(
  context: RepositoryContext &
    NavigationContext & {
      commit: Commit;
      navigationTitle?: string;
      onMoveToCommit?: (direction: "next" | "previous") => void;
      toggleController: ToggleDetailController;
    },
) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const {
    data: { fullCommit, statsMap } = { fullCommit: context.commit, statsMap: {} },
    isLoading,
  }: {
    data?: {
      fullCommit: Commit;
      statsMap: Record<string, FileChangeStats>;
    };
    isLoading: boolean;
  } = usePromise(
    async (_repoPath: string, commitHash: string) => {
      const [fullCommit, statsMap] = await Promise.all([
        context.gitManager.getCommitByHash(commitHash),
        context.gitManager.getCommitFileStats(commitHash),
      ]);

      return {
        fullCommit: fullCommit ?? context.commit,
        statsMap: statsMap,
      };
    },
    [context.gitManager.repoPath, context.commit.hash],
  );

  return (
    <List
      navigationTitle={context.navigationTitle || "Commit Changes"}
      searchBarPlaceholder="Search files by name, path..."
      onSelectionChange={(id) => setSelectedFilePath(id)}
      filtering={{ keepSectionOrder: true }}
      isShowingDetail={context.toggleController.isShowingDetail}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {context.onMoveToCommit && <CommitNavigationActions onMoveToCommit={context.onMoveToCommit} />}
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    >
      {!fullCommit.changedFiles?.length ? (
        <List.EmptyView
          title={isLoading ? "Loading file changes..." : "No file changes"}
          description={isLoading ? "Fetching commit details..." : "This commit has no file changes."}
          icon={Icon.Document}
        />
      ) : (
        <List.Section title={fullCommit.message}>
          {fullCommit.changedFiles.map((file: CommitFileChange) => (
            <FileListItem
              key={file.path}
              file={file}
              selectedFilePath={selectedFilePath}
              statsMap={statsMap}
              {...context}
              commit={fullCommit}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function FileListItem(
  context: RepositoryContext &
    NavigationContext & {
      file: CommitFileChange;
      commit: Commit;
      statsMap: Record<string, { insertions: number; deletions: number }> | undefined;
      toggleController: ToggleDetailController;
      selectedFilePath: string | null;
      onMoveToCommit?: (direction: "next" | "previous") => void;
    },
) {
  // Create a unique identifier for each file item
  const fileId = `${context.file.path}-${context.commit.hash}`;

  // Only load diff if this file is selected and detail view is showing
  const shouldLoadDiff = context.toggleController.isShowingDetail && context.selectedFilePath === fileId;

  const { diff, isLoading, error } = useGitDiff({
    gitManager: context.gitManager,
    options: { file: context.file.path, commitHash: context.commit.hash },
    execute: shouldLoadDiff,
  });

  const diffMarkdown = useMemo(() => {
    const contentParts = [context.file.path];
    if (diff) {
      contentParts.push(diff);
    } else if (isLoading) {
      contentParts.push("Loading...");
    } else if (error) {
      contentParts.push("Error loading diff", error.message);
    }
    return contentParts.join("\n\n");
  }, [context.file.path, diff, isLoading, error]);

  const absolutePath = join(context.gitManager.repoPath, context.file.path);
  const fileExists = existsSync(absolutePath);

  const accessories: List.Item.Accessory[] = useMemo(() => {
    const result: List.Item.Accessory[] = [];
    const stats = context.statsMap?.[context.file.path];
    if (stats) {
      if (stats.insertions > 0) {
        result.push({ tag: { value: `+${stats.insertions}`, color: Color.Green }, tooltip: "Insertions" });
      }
      if (stats.deletions > 0) {
        result.push({ tag: { value: `-${stats.deletions}`, color: Color.Red }, tooltip: "Deletions" });
      }
    }
    return result;
  }, [context.statsMap, context.file.path]);

  return (
    <List.Item
      id={fileId}
      title={basename(context.file.path)}
      subtitle={
        context.toggleController.isShowingDetail
          ? undefined
          : {
              value: context.file.path,
              tooltip: context.file.path,
            }
      }
      icon={CommitFileIcon(context.file)}
      accessories={accessories}
      keywords={[context.file.path, context.file.oldPath].filter((keyword): keyword is string => Boolean(keyword))}
      detail={<List.Item.Detail isLoading={isLoading} markdown={diffMarkdown} />}
      quickLook={fileExists ? { path: absolutePath, name: context.file.path } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={basename(context.file.path)}>
            <FileManagerActions filePath={absolutePath} />
            <ToggleDetailAction controller={context.toggleController} />
            <FileHistoryAction filePath={absolutePath} {...context} />
            <FileRestoreAction filePath={absolutePath} before={false} {...context} />
            <FileRestoreAction before={true} filePath={absolutePath} {...context} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardMenuAction
              contents={[
                { title: "Relative Path", content: context.file.path, icon: Icon.Document },
                { title: "Absolute Path", content: absolutePath, icon: Icon.Document },
                { title: "Commit Hash", content: context.commit.hash, icon: Icon.Hashtag },
                { title: "Short Hash", content: context.commit.shortHash, icon: Icon.Hashtag },
                { title: "Commit Message", content: context.commit.message, icon: Icon.Message },
                { title: "Author Name", content: context.commit.author, icon: Icon.Person },
                { title: "Author Email", content: context.commit.authorEmail, icon: Icon.Envelope },
              ]}
            />
            <FileAttachedLinksAction {...context} filePath={context.file.path} commit={context.commit} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Tracking">
            <GitIgnoreAction filePath={context.file.path} {...context} />
            <GitLFSAction filePath={context.file.path} {...context} />
          </ActionPanel.Section>

          {context.onMoveToCommit && <CommitNavigationActions onMoveToCommit={context.onMoveToCommit} />}
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

function CommitNavigationActions({ onMoveToCommit }: { onMoveToCommit: (direction: "next" | "previous") => void }) {
  return (
    <ActionPanel.Section title="History">
      <Action
        title="Move to Next Commit"
        icon={Icon.ChevronUp}
        onAction={() => onMoveToCommit("next")}
        shortcut={{ modifiers: ["cmd"], key: "]" }}
      />
      <Action
        title="Move to Previous Commit"
        icon={Icon.ChevronDown}
        onAction={() => onMoveToCommit("previous")}
        shortcut={{ modifiers: ["cmd"], key: "[" }}
      />
    </ActionPanel.Section>
  );
}
