import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import { Commit, CommitFileChange } from "../../types";
import { useGitDiff } from "../../hooks/useGitDiff";
import { FileManagerActions } from "../actions/FileActions";
import { FileAttachedLinksAction, FileRestoreAction } from "../actions/StatusActions";
import { CommitFileIcon } from "../icons/StatusIcons";
import { basename, join } from "path";
import { existsSync } from "fs";
import { RepositoryContext } from "../../open-repository";
import { ToggleDetailAction, ToggleDetailController, useToggleDetail } from "../actions/ToggleDetailAction";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";

export function FileHistoryAction(
  context: RepositoryContext & {
    filePath: string;
    onOpen?: () => void;
  },
) {
  if (!existsSync(context.filePath)) return null;

  return (
    <Action.Push
      title="Show File History"
      icon={Icon.Clock}
      onPush={context.onOpen}
      target={<FileHistoryView {...context} />}
      shortcut={{ modifiers: ["cmd", "opt"], key: "h" }}
    />
  );
}

export default function FileHistoryView(
  context: RepositoryContext & {
    filePath: string;
    onOpen?: () => void;
  },
) {
  const toggleDetailController = useToggleDetail("FileHistory-Detail", "Detail", false);
  const toggleMetadataController = useToggleDetail("FileHistory-Metadata", "Metadata", true);
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);

  const {
    data: commits,
    isLoading,
    revalidate: revalidateHistory,
    error,
  } = usePromise(
    async (filePath, _repoPath) => {
      return await context.gitManager.getFileHistory(filePath);
    },
    [context.filePath, context.gitManager.repoPath],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`File History`}
      searchBarPlaceholder="Search commits by message, sha, author..."
      onSelectionChange={setSelectedCommitId}
      isShowingDetail={toggleDetailController.isShowingDetail}
      actions={
        <ActionPanel>
          <RefreshHistoryAction revalidate={revalidateHistory} />
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView title="Error loading history" description={error.message} icon={Icon.ExclamationMark} />
      ) : !commits || commits.length === 0 ? (
        <List.EmptyView title="No history" description="No commits have modified this file." icon={Icon.Document} />
      ) : (
        <List.Section title={basename(context.filePath)} subtitle={`${commits.length} commits`}>
          {commits.map((commit) => (
            <CommitListItem
              {...context}
              key={commit.hash}
              commit={commit}
              file={commit.changedFiles![0]}
              toggleDetailController={toggleDetailController}
              toggleMetadataController={toggleMetadataController}
              selectedCommitId={selectedCommitId}
              onRevalidateHistory={revalidateHistory}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CommitListItem(
  context: RepositoryContext & {
    file: CommitFileChange;
    commit: Commit;
    selectedCommitId: string | null;
    onRevalidateHistory: () => void;
    toggleDetailController: ToggleDetailController;
    toggleMetadataController: ToggleDetailController;
  },
) {
  // Only load diff if this commit is selected and detail is visible
  const shouldLoadDiff =
    context.toggleDetailController.isShowingDetail && context.selectedCommitId === context.commit.hash;

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

  const accessories: List.Item.Accessory[] = useMemo(() => {
    if (context.toggleDetailController.isShowingDetail) {
      return [];
    }

    return [
      { text: { value: context.commit.author }, tooltip: context.commit.authorEmail },
      { text: context.commit.date.toRelativeDateString() },
    ];
  }, [
    context.commit.author,
    context.commit.authorEmail,
    context.commit.date,
    context.toggleDetailController.isShowingDetail,
  ]);

  const absolutePath = join(context.gitManager.repoPath, context.file.path);
  const fileExists = existsSync(absolutePath);

  return (
    <List.Item
      id={context.commit.hash}
      title={context.commit.message}
      icon={CommitFileIcon(context.file)}
      accessories={accessories}
      keywords={[context.commit.hash, context.commit.shortHash, context.commit.author, context.commit.authorEmail]}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={diffMarkdown}
          metadata={
            context.toggleMetadataController.isShowingDetail ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Author" text={context.commit.author} />
                <List.Item.Detail.Metadata.Label title="Email" text={context.commit.authorEmail} />
                <List.Item.Detail.Metadata.Label title="Date" text={context.commit.date.toLocaleString()} />
                <List.Item.Detail.Metadata.Label title="Hash" text={context.commit.hash} />
              </List.Item.Detail.Metadata>
            ) : undefined
          }
        />
      }
      quickLook={fileExists ? { path: absolutePath, name: absolutePath } : undefined}
      actions={
        <ActionPanel>
          <ToggleDetailAction controller={context.toggleDetailController} />

          {context.toggleDetailController.isShowingDetail && (
            <ToggleDetailAction
              controller={context.toggleMetadataController}
              shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
            />
          )}

          <ActionPanel.Section title={basename(context.file.path)}>
            <FileManagerActions filePath={absolutePath} />
            <FileRestoreAction filePath={absolutePath} before={false} {...context} />
            <FileRestoreAction filePath={absolutePath} before={true} {...context} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <FileAttachedLinksAction {...context} filePath={context.file.path} commit={context.commit} />
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
          </ActionPanel.Section>

          <RefreshHistoryAction revalidate={context.onRevalidateHistory} />
        </ActionPanel>
      }
    />
  );
}

function RefreshHistoryAction({ revalidate }: { revalidate: () => void }) {
  return (
    <Action
      title="Refresh"
      onAction={revalidate}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}
