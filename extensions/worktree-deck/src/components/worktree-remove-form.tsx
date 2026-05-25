import { Action, ActionPanel, Alert, Form, Icon, confirmAlert, useNavigation } from "@raycast/api";
import type { Worktree, WorktreeMergeStatus } from "../composition-root";
import type { WorktreeTitle } from "../application/worktree-title.entity";
import { formatMergeStatusLabel, normalizeWorktreeBranchName } from "./worktree-ui-utils";

/**
 * worktree 削除フォームを表示する
 */
export function RemoveWorktreeForm({
  item,
  onRemove,
}: {
  item: Worktree;
  onRemove: (args: { item: Worktree; deleteBranch: boolean; deleteRemoteBranch: boolean }) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const branchName = normalizeWorktreeBranchName(item.branch);
  const sessionTitle = resolvePrimarySessionTitle(item.titleEntries);
  const worktreeName = resolveWorktreeName(item.path);
  const gitState = buildGitStateLabel({
    mergeStatus: item.mergeStatus ?? null,
    mergeStatusError: item.mergeStatusError ?? null,
    lastCommitAt: item.lastCommitAt ?? null,
    baseRef: item.baseRef ?? null,
    aheadCount: item.aheadCount ?? null,
    behindCount: item.behindCount ?? null,
  });

  const handleSubmit = async (values: RemoveWorktreeFormValues) => {
    const confirmed = await confirmAlert({
      title: `Remove "${worktreeName}"?`,
      message: buildRemoveConfirmationMessage({
        repo: item.repo,
        worktreeName,
        worktreePath: item.path,
        branch: branchName,
        sessionTitle,
        mergeStatus: item.mergeStatus ?? null,
        mergeStatusError: item.mergeStatusError ?? null,
        lastCommitAt: item.lastCommitAt ?? null,
        baseRef: item.baseRef ?? null,
        aheadCount: item.aheadCount ?? null,
        behindCount: item.behindCount ?? null,
        deleteBranch: values.deleteBranch,
        deleteRemoteBranch: values.deleteRemoteBranch,
      }),
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) {
      return;
    }
    void onRemove({
      item,
      deleteBranch: values.deleteBranch,
      deleteRemoteBranch: values.deleteRemoteBranch,
    });
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Remove Worktree" icon={Icon.Trash} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Worktree" text={item.path} />
      <Form.Description title="Branch" text={branchName ?? "not detected"} />
      <Form.Description title="Session" text={sessionTitle ?? "No session title"} />
      <Form.Description title="Git State" text={gitState} />
      <Form.Checkbox id="deleteBranch" label="Delete local branch" defaultValue={false} />
      <Form.Checkbox id="deleteRemoteBranch" label="Delete remote branch" defaultValue={false} />
    </Form>
  );
}

type RemoveWorktreeFormValues = {
  deleteBranch: boolean;
  deleteRemoteBranch: boolean;
};

/**
 * 削除確認ダイアログ用の文面を組み立てる
 */
function buildRemoveConfirmationMessage(args: {
  repo: string;
  worktreeName: string;
  worktreePath: string;
  branch: string | null;
  sessionTitle: string | null;
  mergeStatus?: WorktreeMergeStatus | null;
  mergeStatusError?: string | null;
  lastCommitAt?: string | null;
  baseRef?: string | null;
  aheadCount?: number | null;
  behindCount?: number | null;
  deleteBranch: boolean;
  deleteRemoteBranch: boolean;
}): string {
  const lines = [`Session:`, args.sessionTitle ?? "No session title"];
  const gitStatusLines = buildGitStatusLines({
    mergeStatus: args.mergeStatus ?? null,
    mergeStatusError: args.mergeStatusError ?? null,
    lastCommitAt: args.lastCommitAt ?? null,
    baseRef: args.baseRef ?? null,
    aheadCount: args.aheadCount ?? null,
    behindCount: args.behindCount ?? null,
  });
  if (gitStatusLines.length > 0) {
    lines.push("", "Git status:", ...gitStatusLines);
  }
  return lines.join("\n");
}

/**
 * synced 以外の git 状態表示を組み立てる
 */
function buildGitStatusLines(args: {
  mergeStatus: WorktreeMergeStatus | null;
  mergeStatusError: string | null;
  lastCommitAt: string | null;
  baseRef: string | null;
  aheadCount: number | null;
  behindCount: number | null;
}): string[] {
  if (args.mergeStatus === "synced" && !args.mergeStatusError) {
    return [];
  }
  const lines = [`Status: ${formatMergeStatusLabel(args.mergeStatus ?? "unknown")}`];
  if (args.lastCommitAt) {
    lines.push(`Commit: ${args.lastCommitAt}`);
  }
  const baseRef = args.baseRef?.trim();
  if (baseRef) {
    lines.push(`Base: ${baseRef}`);
  }
  if (args.aheadCount != null || args.behindCount != null) {
    lines.push(`Ahead/Behind: ${args.aheadCount ?? "?"} / ${args.behindCount ?? "?"}`);
  }
  if (args.mergeStatusError) {
    lines.push(`Error: ${args.mergeStatusError}`);
  }
  return lines;
}

/**
 * git 状態の要約表示を組み立てる
 */
function buildGitStateLabel(args: {
  mergeStatus: WorktreeMergeStatus | null;
  mergeStatusError: string | null;
  lastCommitAt: string | null;
  baseRef: string | null;
  aheadCount: number | null;
  behindCount: number | null;
}): string {
  if (args.mergeStatus === "synced" && !args.mergeStatusError) {
    return "synced";
  }
  return buildGitStatusLines(args).join("  ");
}

/**
 * 表示用の worktree 名を path から取り出す
 */
function resolveWorktreeName(worktreePath: string): string {
  const parts = worktreePath.split("/").filter((part) => part.trim());
  return parts.at(-1)?.trim() || worktreePath;
}

/**
 * 確認表示で使う代表セッションタイトルを選ぶ
 */
function resolvePrimarySessionTitle(titleEntries?: WorktreeTitle[]): string | null {
  const title = titleEntries?.find((entry) => entry.title.trim())?.title.trim();
  return title || null;
}
