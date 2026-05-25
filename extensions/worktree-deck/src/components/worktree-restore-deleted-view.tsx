import { Action, ActionPanel, Icon, List, Toast, environment, showToast, useNavigation } from "@raycast/api";
import { existsSync } from "node:fs";
import { useCallback, useEffect, useState } from "react";

import { createWorktreeUsecase, type WorktreeCreateContext } from "../application/create-worktree.usecase";
import { deletedWorktreesUsecase, type DeletedWorktreeEntry } from "../application/deleted-worktrees.usecase";
import { resolveWorktreeDeckCompositionRoot } from "../composition-root";
import type { WorktreeOpenApp } from "../domain/worktree-open-app.service";
import { formatExecErrorMessage } from "./worktree-ui-utils";
import { openWorktreeWhenReady } from "./worktree-create-form";

const WORKTREE_DECK_COMPOSITION_ROOT = resolveWorktreeDeckCompositionRoot();
const { saveBaseRefForBranchConfig, saveBaseRefForWorktreePath, saveOpenAppForWorktreePath } =
  WORKTREE_DECK_COMPOSITION_ROOT.createWorktreeFormDependencies;

/**
 * 復元画面で利用する作成パス情報
 */
type RestoreWorktreePaths = {
  scriptPath: string;
};

/**
 * 削除済み worktree の復元候補一覧を表示する
 */
export function RestoreDeletedWorktreeView({ onComplete }: { onComplete?: () => void }) {
  const { pop } = useNavigation();
  const [entries, setEntries] = useState<DeletedWorktreeEntry[]>([]);
  const [paths, setPaths] = useState<RestoreWorktreePaths | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resolvedPaths, restorableEntries] = await Promise.all([
        createWorktreeUsecase.resolvePaths({
          context: buildWorktreeCreateContext(),
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.createWorktreeDependencies,
        }),
        deletedWorktreesUsecase.listRestorableDeletedWorktrees({
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.deletedWorktreeDependencies,
        }),
      ]);
      setPaths(resolvedPaths);
      setEntries(restorableEntries);
      setErrorMessage(null);
    } catch (error) {
      const message = formatExecErrorMessage(error);
      setErrorMessage(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load deleted worktrees",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const handleRestore = useCallback(
    async (entry: DeletedWorktreeEntry) => {
      if (!paths) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to restore worktree",
          message: "Create paths are not resolved.",
        });
        return;
      }
      const toast = await showToast({ style: Toast.Style.Animated, title: "Restoring worktree" });
      try {
        const openApp = resolveRestoreOpenApp(entry.openApp);
        const result = await createWorktreeUsecase.create({
          command: {
            repoRoot: entry.repoRoot,
            branch: entry.branch,
            startPoint: entry.baseRef ?? undefined,
            scriptPath: paths.scriptPath,
            mapValue: entry.mapValue?.trim() || entry.repoName,
            allowExistingWorktree: true,
          },
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.createWorktreeDependencies,
        });
        await saveRestoreMetadata({
          createdPath: result.createdPath,
          branch: entry.branch,
          baseRef: entry.baseRef ?? null,
          openApp,
        });
        await deletedWorktreesUsecase.forgetDeletedWorktree({
          input: { repoRoot: entry.repoRoot, branch: entry.branch },
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.deletedWorktreeDependencies,
        });
        setEntries((current) =>
          current.filter(
            (currentEntry) => currentEntry.repoRoot !== entry.repoRoot || currentEntry.branch !== entry.branch,
          ),
        );
        onComplete?.();
        pop();
        if (existsSync(result.createdPath)) {
          void openWorktreeWhenReady(result.createdPath, openApp);
        }
        toast.style = Toast.Style.Success;
        toast.title = result.reusedExisting === true ? "Worktree already restored" : "Worktree restored";
        toast.message = result.createdPath;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to restore worktree";
        toast.message = formatExecErrorMessage(error);
      }
    },
    [onComplete, paths, pop],
  );

  if (errorMessage) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="Failed to load deleted worktrees" description={errorMessage} icon={Icon.Warning} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search deleted worktrees">
      <List.EmptyView title="No restorable deleted worktrees" icon={Icon.ArrowClockwise} />
      {entries.map((entry) => (
        <List.Item
          key={`${entry.repoRoot}:${entry.branch}`}
          title={entry.branch}
          subtitle={entry.repoName}
          accessories={[{ text: formatRemovedAt(entry.removedAt) }]}
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Restore Worktree" icon={Icon.ArrowClockwise} onAction={() => void handleRestore(entry)} />
              <Action.CopyToClipboard title="Copy Branch" icon={Icon.Clipboard} content={entry.branch} />
              <Action.CopyToClipboard title="Copy Repository" icon={Icon.Clipboard} content={entry.repoRoot} />
              <Action.CopyToClipboard title="Copy Deleted Path" icon={Icon.Clipboard} content={entry.worktreePath} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * 復元時に使う起動アプリを正規化する
 */
function resolveRestoreOpenApp(value?: WorktreeOpenApp | null): WorktreeOpenApp {
  return value === "codex-app" ? "codex-app" : "zed";
}

/**
 * 復元した worktree のメタ情報を保存する
 */
async function saveRestoreMetadata(args: {
  createdPath: string;
  branch: string;
  baseRef: string | null;
  openApp: WorktreeOpenApp;
}): Promise<void> {
  if (args.baseRef) {
    await saveBaseRefForBranchConfig({ worktreePath: args.createdPath, branch: args.branch, baseRef: args.baseRef });
    await saveBaseRefForWorktreePath(args.createdPath, args.baseRef);
  }
  await saveOpenAppForWorktreePath(args.createdPath, args.openApp);
}

/**
 * 削除日時を一覧アクセサリ表示向けに整える
 */
function formatRemovedAt(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString();
}

/**
 * 環境変数からホームディレクトリを解決する
 */
function resolveHomeDir(): string | null {
  return process.env.HOME?.trim() ?? process.env.USERPROFILE?.trim() ?? null;
}

/**
 * worktree 作成ユースケースの実行コンテキストを構築する
 */
function buildWorktreeCreateContext(): WorktreeCreateContext {
  return {
    env: process.env,
    homeDir: resolveHomeDir(),
    assetsPath: environment.assetsPath,
    packageDir: __dirname,
    packageName: "worktree-deck",
  };
}
