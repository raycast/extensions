import {
  Alert,
  Color,
  Icon,
  MenuBarExtra,
  Toast,
  confirmAlert,
  environment,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { listWorktreesUsecase } from "./application/list-worktrees.usecase";
import type { LoadWorktreeDeckTitlesSnapshotDependencies } from "./application/worktree-deck-snapshot.usecase";
import { worktreeMenuBarLifecycleUsecase } from "./application/worktree-menu-bar-lifecycle.usecase";
import { resolveWorktreeDeckCompositionRoot, type Worktree, type WorktreeTitle } from "./composition-root";
import type { WorktreeMenuBarSummarySnapshot } from "./domain/worktree-menu-bar-summary.service";
import {
  worktreeMenuBarStatusService,
  type WorktreeMenuBarItem,
  type WorktreeMenuBarStatusSummary,
} from "./domain/worktree-menu-bar-status.service";
import { applyRaycastPreferencesToProcessEnv } from "./raycast-preferences";

/**
 * メニューバー表示用の初期件数
 */
const EMPTY_SUMMARY: WorktreeMenuBarStatusSummary = {
  blue: 0,
  green: 0,
  yellow: 0,
};

/**
 * メニューバー状態読み込みに必要な依存
 */
export type WorktreeMenuBarSummaryDependencies = {
  listWorktrees: typeof listWorktreesUsecase.list;
  loadTitlesForPaths: LoadWorktreeDeckTitlesSnapshotDependencies["loadTitlesForPaths"];
  saveLastSummary(snapshot: WorktreeMenuBarSummarySnapshot): Promise<void>;
};

/**
 * worktree-status-menu-bar で利用する依存解決結果
 */
const WORKTREE_DECK_COMPOSITION_ROOT = resolveWorktreeDeckCompositionRoot();

/**
 * worktree に latest session のタイトル情報を付与する
 */
function buildMenuBarItems(args: {
  worktrees: Worktree[];
  titlesByPath: Map<string, WorktreeTitle[]>;
}): WorktreeMenuBarItem[] {
  return args.worktrees.map((item) => ({
    titleEntries: (args.titlesByPath.get(item.path) ?? []).map((entry) => ({
      status: entry.status,
      isWaitingForUser: entry.isWaitingForUser === true,
    })),
  }));
}

/**
 * メニューバーに表示する worktree 状態を取得する
 */
export async function loadWorktreeMenuBarSummaryWithDependencies(args: {
  dependencies: WorktreeMenuBarSummaryDependencies;
}): Promise<WorktreeMenuBarSummarySnapshot> {
  applyRaycastPreferencesToProcessEnv();

  const homeDir = process.env.HOME?.trim() ?? null;
  const listed = await args.dependencies.listWorktrees({
    context: {
      env: process.env,
      cwd: process.cwd(),
      homeDir,
      assetsPath: environment.assetsPath,
      packageDir: __dirname,
      packageName: "worktree-deck",
    },
    dependencies: WORKTREE_DECK_COMPOSITION_ROOT.listWorktreesDependencies,
    options: { preferCache: false },
  });
  const titlesByPath = await args.dependencies.loadTitlesForPaths({
    paths: listed.worktrees.map((item) => item.path),
    env: process.env,
    cwd: process.cwd(),
    homeDir,
    assetsPath: environment.assetsPath,
    packageDir: __dirname,
    packageName: "worktree-deck",
  });
  const menuBarItems = buildMenuBarItems({
    worktrees: listed.worktrees,
    titlesByPath,
  });
  const snapshot = {
    summary: worktreeMenuBarStatusService.summarize(menuBarItems),
    total: listed.worktrees.length,
  };
  await args.dependencies.saveLastSummary(snapshot);
  return snapshot;
}

/**
 * 既定依存でメニューバー状態を取得する
 */
async function loadWorktreeMenuBarSummary(): Promise<WorktreeMenuBarSummarySnapshot> {
  return loadWorktreeMenuBarSummaryWithDependencies({
    dependencies: {
      listWorktrees: listWorktreesUsecase.list,
      loadTitlesForPaths: WORKTREE_DECK_COMPOSITION_ROOT.loadWorktreeDeckTitlesSnapshotDependencies.loadTitlesForPaths,
      saveLastSummary: WORKTREE_DECK_COMPOSITION_ROOT.worktreeMenuBarSummaryStore.saveLastSummary,
    },
  });
}

/**
 * worktree status メニューバーの起動時描画可否を判定する
 */
async function resolveWorktreeStatusMenuBarStartup(): Promise<boolean> {
  return worktreeMenuBarLifecycleUsecase.resolveStartup({
    launchType: environment.launchType,
    dependencies: WORKTREE_DECK_COMPOSITION_ROOT.worktreeMenuBarLifecycleDependencies,
  });
}

/**
 * worktree の latest session 状態をメニューバーへ表示する
 */
export default function Command() {
  const [summary, setSummary] = useState<WorktreeMenuBarStatusSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void resolveWorktreeStatusMenuBarStartup()
      .then(async (shouldRenderStartup) => {
        if (cancelled) {
          return;
        }
        setShouldRender(shouldRenderStartup);
        if (!shouldRenderStartup) {
          setSummary(EMPTY_SUMMARY);
          setTotal(0);
          setErrorMessage(null);
          return;
        }
        return loadWorktreeMenuBarSummary();
      })
      .then((result) => {
        if (cancelled || !result) {
          return;
        }
        setSummary(result.summary);
        setTotal(result.total);
        setErrorMessage(null);
      })
      .catch(async (error: unknown) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        const lastLoaded = await WORKTREE_DECK_COMPOSITION_ROOT.worktreeMenuBarSummaryStore.loadLastSummary();
        if (cancelled) {
          return;
        }
        if (lastLoaded) {
          setSummary(lastLoaded.summary);
          setTotal(lastLoaded.total);
        }
        setErrorMessage(message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const endWorktreeStatus = useCallback(() => {
    void (async () => {
      const confirmed = await confirmAlert({
        title: "End Worktree Status?",
        message: "The menu bar item will be hidden until you launch Worktree Status again.",
        primaryAction: {
          title: "End",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) {
        return;
      }
      await worktreeMenuBarLifecycleUsecase.stop({
        dependencies: WORKTREE_DECK_COMPOSITION_ROOT.worktreeMenuBarLifecycleDependencies,
      });
      setShouldRender(false);
      await showToast({
        style: Toast.Style.Success,
        title: "Worktree Status ended",
      });
    })();
  }, []);

  if (!shouldRender) {
    return null;
  }

  const title = worktreeMenuBarStatusService.formatTitle(summary);
  const tooltip = errorMessage ? `Failed to load worktree status: ${errorMessage}` : `Worktrees: ${total}`;

  return (
    <MenuBarExtra title={title} tooltip={tooltip} isLoading={isLoading}>
      <MenuBarExtra.Section title="Worktree Status">
        <MenuBarExtra.Item
          title="Done"
          subtitle={`${summary.blue}`}
          icon={{ source: Icon.Circle, tintColor: Color.Blue }}
        />
        <MenuBarExtra.Item
          title="Working"
          subtitle={`${summary.green}`}
          icon={{ source: Icon.Circle, tintColor: Color.Green }}
        />
        <MenuBarExtra.Item
          title="Waiting"
          subtitle={`${summary.yellow}`}
          icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
        />
        <MenuBarExtra.Item title="Total" subtitle={`${total}`} icon={Icon.List} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Settings">
        <MenuBarExtra.Item
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={() => void openExtensionPreferences()}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="End Worktree Status"
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          onAction={endWorktreeStatus}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
