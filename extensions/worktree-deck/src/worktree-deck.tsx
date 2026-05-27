import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  type Keyboard,
  closeMainWindow,
  confirmAlert,
  environment,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useCachedState } from "@raycast/utils";
import { CreateWorktreeForm } from "./components/worktree-create-form";
import { MergeWorktreeForm } from "./components/worktree-merge-form";
import { CreatePullRequestForm } from "./components/worktree-pull-request-form";
import { RenameWorktreeForm } from "./components/worktree-rename-form";
import { RestoreDeletedWorktreeView } from "./components/worktree-restore-deleted-view";
import { type RepositoryMapping } from "./domain/repository-mapping.service";
import { parseSearchTerms } from "./search-utils";
import { RemoveWorktreeForm } from "./components/worktree-remove-form";
import { SessionDetailView } from "./components/session-detail-view";
import {
  buildCodexSessionEntries,
  CodexSessionSelectView,
  SELECT_CODEX_SESSION_ACTION_TITLE,
  resolveCodexSessionOpenPlan,
} from "./components/codex-session-select-view";
import { RepositoryMappingManager } from "./components/repository-mapping-manager";
import { SettingsView } from "./components/settings-view";
import {
  buildWorktreeDeckDisplayCache,
  hasWorktreeDeckDisplayCacheData,
  isSameWorktreeDeckDisplayCache,
  type WorktreeDeckDisplayCache,
} from "./application/worktree-deck-display-cache";
import {
  canPullBranch,
  formatExecErrorMessage,
  formatMergeStatusLabel,
  normalizeWorktreeBranchName,
} from "./components/worktree-ui-utils";
import { buildOpenAppAccessory, resolveOpenAppIcon } from "./components/worktree-open-app-icon";
import { worktreeIdeAppService, type WorktreeIdeApp } from "./domain/worktree-ide-app.service";
import { worktreeDeckDataStore } from "./components/worktree-deck-data-store";
import {
  SCROLL_DETAIL_DOWN_SHORTCUT,
  SCROLL_DETAIL_UP_SHORTCUT,
  buildScrollableDetailMarkdown,
  resolveNextDetailScrollOffset,
  type DetailScrollDirection,
} from "./components/worktree-detail-scroll";
import {
  buildDetailMarkdown,
  buildSectionsWithMappings,
  buildSortedSectionEntries,
  filterEntriesBySearchText,
  formatBranchTitle,
  hasAnySessionWaitingForUser,
  parseDisplayMode,
  resolveEntryItemId,
  resolveWorktreeStatus,
  toggleDisplayMode,
  type SectionEntryOrder,
  type WorktreeDeckDisplayMode,
} from "./components/worktree-deck-view-model";
import {
  buildPersistedSelectionState,
  buildSelectionIndex,
  isSamePersistedSelectionState,
  resolveFallbackSelectionItemId,
  resolveInitialSelectionRestoreApplication,
  resolvePostLoadSelectionRestorePhase,
  resolveControlledListSelectionItemId,
  resolveSelectionChangeDecision,
  shouldScheduleInitialSelectionUnlock,
  type PersistedSelectionState,
  type SelectionRestorePhase,
} from "./components/worktree-deck-selection";
import { deletedWorktreesUsecase } from "./application/deleted-worktrees.usecase";
import { removeWorktreeUsecase } from "./application/remove-worktree.usecase";
import { worktreeRenameUsecase } from "./application/worktree-rename.usecase";
import { worktreeMergeUsecase, type WorktreeMergePlan } from "./application/worktree-merge.usecase";
import { worktreePullUsecase } from "./application/worktree-pull.usecase";
import { worktreePullRequestUsecase } from "./application/worktree-pull-request.usecase";
import { worktreeSessionFileUsecase } from "./application/worktree-session-file.usecase";
import { worktreeOpenAppUsecase } from "./application/worktree-open-app.usecase";
import { applyRaycastPreferencesToProcessEnv } from "./raycast-preferences";
import {
  resolveWorktreeDeckCompositionRoot,
  type Worktree,
  type WorktreeMergeStatus,
  type WorktreePullRequestResult,
  type WorktreeTitle,
} from "./composition-root";
import { worktreeOpenAppService, type WorktreeOpenApp } from "./domain/worktree-open-app.service";
import { buildGlobalActionItems, type GlobalActionId } from "./global-actions";

export {
  buildDetailMarkdown,
  buildSectionsWithMappings,
  buildSortedSectionEntries,
  formatTitleEntry,
  parseDisplayMode,
  toggleDisplayMode,
} from "./components/worktree-deck-view-model";
export type { WorktreeDeckDisplayMode } from "./components/worktree-deck-view-model";

const WORKTREE_DECK_COMPOSITION_ROOT = resolveWorktreeDeckCompositionRoot();

/**
 * 表示モード選択ドロップダウンの識別子
 */
const DISPLAY_MODE_DROPDOWN_ID = "worktree-deck.display-mode";

/**
 * Codex App セッションアーカイブの保存キー
 */
const CODEX_SESSION_ARCHIVE_CACHE_KEY = "worktree-deck.codex-session-archive.thread-ids.v1";

/**
 * 初期表示時の一覧順を保持する状態
 */
type PinnedListOrder = {
  basePath: string | null;
  displayMode: WorktreeDeckDisplayMode;
  sectionOrder: Map<string, number>;
  entryOrder: SectionEntryOrder;
};

/**
 * セッション詳細表示アクションのショートカット
 */
export const SHOW_DETAILS_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "enter" };

/**
 * 保存済みアプリと逆側で開くアクションを Raycast の secondary action 位置に置くための添字
 *
 * Raycast の List では 2 番目の Action が自動的に Cmd+Enter になる。
 * `shortcut={{ modifiers: ["cmd"], key: "enter" }}` を明示すると予約済み警告が出て削除されるため、
 * shortcut prop ではなく ActionPanel 直下の並び順で切り替え起動を表現する。
 */
export const OPEN_ALTERNATE_APP_ACTION_INDEX = 1;

/**
 * Open アクションの意図
 */
export type OpenActionIntent = "configured" | "switch-preference";

/**
 * Open アクションの描画計画
 */
export type OpenActionPlan = {
  openApp: WorktreeOpenApp;
  intent: OpenActionIntent;
  threadId: string | null;
};

/**
 * Open アクションに割り当てるショートカットを返す
 *
 * Cmd+Enter は Raycast の secondary action 予約ショートカットとして使うため、ここでは明示しない。
 */
export function resolveOpenActionShortcut(intent: OpenActionIntent): undefined {
  void intent;
  return undefined;
}

/**
 * 保存済みアプリとは逆の起動アプリを返す
 */
export function resolveAlternateOpenApp(openApp: WorktreeOpenApp): WorktreeOpenApp {
  return openApp === "codex-app" ? "zed" : "codex-app";
}

/**
 * Open アクションの ActionPanel 直下での並び順を返す
 */
export function buildOpenActionPlans(args: {
  openApp: WorktreeOpenApp;
  threadId: string | null;
}): readonly [OpenActionPlan, OpenActionPlan] {
  const alternateOpenApp = resolveAlternateOpenApp(args.openApp);
  const plans = [
    {
      openApp: args.openApp,
      intent: "configured",
      threadId: args.threadId,
    },
    {
      openApp: alternateOpenApp,
      intent: "switch-preference",
      threadId: resolveOpenActionThreadId({
        openApp: alternateOpenApp,
        intent: "switch-preference",
        threadId: args.threadId,
      }),
    },
  ] as const;
  return plans;
}

/**
 * section の現在順を rank 化する
 */
function buildSectionOrder(sections: ReturnType<typeof buildSectionsWithMappings>): Map<string, number> {
  return new Map(sections.map((section, index) => [section.repo, index]));
}

/**
 * section entry の現在順を rank 化する
 */
function buildSectionEntryOrder(args: {
  sections: ReturnType<typeof buildSectionsWithMappings>;
  titlesByPath: Map<string, WorktreeTitle[]>;
  originLastCommitByPath: Map<string, string | null>;
  originBranchByPath: Map<string, string | null>;
  includeOrigin: boolean;
}): SectionEntryOrder {
  const order: SectionEntryOrder = new Map();
  let index = 0;
  for (const section of args.sections) {
    const entries = buildSortedSectionEntries({
      items: section.items,
      titlesByPath: args.titlesByPath,
      mappedOrigins: section.mappedOrigins,
      originLastCommitByPath: args.originLastCommitByPath,
      originBranchByPath: args.originBranchByPath,
      includeOrigin: args.includeOrigin,
    });
    for (const entry of entries) {
      order.set(resolveEntryItemId(entry), index);
      index += 1;
    }
  }
  return order;
}

/**
 * 現在表示されている自然順を固定順として保存する
 */
function buildPinnedListOrder(args: {
  basePath: string | null;
  displayMode: WorktreeDeckDisplayMode;
  sections: ReturnType<typeof buildSectionsWithMappings>;
  titlesByPath: Map<string, WorktreeTitle[]>;
  originLastCommitByPath: Map<string, string | null>;
  originBranchByPath: Map<string, string | null>;
}): PinnedListOrder {
  return {
    basePath: args.basePath,
    displayMode: args.displayMode,
    sectionOrder: buildSectionOrder(args.sections),
    entryOrder: buildSectionEntryOrder({
      sections: args.sections,
      titlesByPath: args.titlesByPath,
      originLastCommitByPath: args.originLastCommitByPath,
      originBranchByPath: args.originBranchByPath,
      includeOrigin: args.displayMode === "show-all",
    }),
  };
}

/**
 * pinned order が現在の表示条件で使えるか判定する
 */
function isPinnedListOrderApplicable(
  pinnedOrder: PinnedListOrder | null,
  args: { basePath: string | null; displayMode: WorktreeDeckDisplayMode },
): pinnedOrder is PinnedListOrder {
  return pinnedOrder?.basePath === args.basePath && pinnedOrder.displayMode === args.displayMode;
}

/**
 * CA 起動時にセッション選択を挟むか判定する
 */
export function shouldSelectCodexSessionForOpenAction(args: {
  openApp: WorktreeOpenApp;
  intent: OpenActionIntent;
}): boolean {
  void args.intent;
  return args.openApp === "codex-app";
}

/**
 * Open アクションへ渡す Codex thread id を返す
 */
export function resolveOpenActionThreadId(args: {
  openApp: WorktreeOpenApp;
  intent: OpenActionIntent;
  threadId: string | null;
}): string | null {
  void args.intent;
  if (args.openApp !== "codex-app") {
    return null;
  }
  return args.threadId;
}

/**
 * 起動アプリに合わせたアクション名を返す
 */
export function formatOpenActionTitle(openApp: WorktreeOpenApp, ideApp: WorktreeIdeApp = "zed"): string {
  return openApp === "codex-app" ? "Open in CA" : `Open in ${worktreeIdeAppService.formatIdeAppLabel(ideApp)}`;
}

/**
 * Codex App のセッション選択アクション名を返す
 */
function formatCodexSessionSelectActionTitle(): string {
  return SELECT_CODEX_SESSION_ACTION_TITLE;
}

/**
 * ワークツリー一覧の取得・表示・操作を行うメイン画面
 */
export default function Command() {
  applyRaycastPreferencesToProcessEnv();

  const { push } = useNavigation();
  /**
   * 計測ログを常に出力するか
   */
  const FORCE_TIMING_LOG = true;
  /**
   * 計測ログの有効状態を一度だけ通知する
   */
  useEffect(() => {
    console.info(`[worktree-deck][timing] enabled=${FORCE_TIMING_LOG}`);
  }, []);
  const [hiddenWorktreePaths, setHiddenWorktreePaths] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailScrollOffsetsByItemId, setDetailScrollOffsetsByItemId] = useState<Record<string, number>>({});
  const [persistedSelection, setPersistedSelection] = useState<PersistedSelectionState | null>(null);
  const [selectionPhase, setSelectionPhase] = useState<SelectionRestorePhase>("loading-storage");
  const [searchText, setSearchText] = useState("");
  const [pinnedListOrder, setPinnedListOrder] = useState<PinnedListOrder | null>(null);
  const [displayMode, setDisplayMode] = useCachedState<WorktreeDeckDisplayMode>(
    "worktree-deck.displayMode",
    "show-all",
  );
  const [preferredIdeApp, setPreferredIdeApp] = useState<WorktreeIdeApp>("zed");
  const [displayCache, setDisplayCache] = useCachedState<WorktreeDeckDisplayCache | null>(
    "worktree-deck.display-cache",
    null,
  );
  const [archivedCodexSessionThreadIds, setArchivedCodexSessionThreadIds] = useCachedState<string[]>(
    CODEX_SESSION_ARCHIVE_CACHE_KEY,
    [],
  );
  const shouldRefreshOnPop = useRef(false);
  const displayCacheRef = useRef<WorktreeDeckDisplayCache | null>(displayCache);
  const lastShownErrorIdRef = useRef(0);
  const selectionSettlingSignatureRef = useRef<string | null>(null);
  const hasOpenedRepositoryMappingOnboardingRef = useRef(false);

  /**
   * General Settings の IDE 設定を読み込む
   */
  useEffect(() => {
    let active = true;
    async function loadPreferredIdeAppSetting(): Promise<void> {
      try {
        const loadedIdeApp = await WORKTREE_DECK_COMPOSITION_ROOT.generalSettingsStore.loadPreferredIdeApp();
        if (active) {
          setPreferredIdeApp(loadedIdeApp);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load IDE setting",
          message: formatExecErrorMessage(error),
        });
      }
    }
    void loadPreferredIdeAppSetting();
    return () => {
      active = false;
    };
  }, []);

  /**
   * 計測ログを有効にするか判定する
   */
  const shouldLogTiming = useCallback((): boolean => {
    return FORCE_TIMING_LOG;
  }, []);
  /**
   * 計測ログを出力する
   */
  const logTiming = useCallback(
    (label: string, elapsedMs: number): void => {
      if (!shouldLogTiming()) {
        return;
      }
      const msText = Number.isFinite(elapsedMs) ? elapsedMs.toFixed(1) : "0.0";
      console.info(`[worktree-deck][timing] ${label}: ${msText}ms`);
    },
    [shouldLogTiming],
  );
  /**
   * worktree 名の一覧ログを出力する
   */
  const logWorktreeNames = useCallback(
    (items: Worktree[]): void => {
      if (!shouldLogTiming()) {
        return;
      }
      const names = items.map((item) => `${item.repo}:${item.branch ?? "root"}`);
      console.info(`[worktree-deck][timing] worktrees=${names.length} ${names.join(", ")}`);
    },
    [shouldLogTiming],
  );
  const dataSnapshot = useSyncExternalStore(
    worktreeDeckDataStore.subscribe,
    worktreeDeckDataStore.getSnapshot,
    worktreeDeckDataStore.getSnapshot,
  );
  const {
    worktrees,
    listedWorktrees,
    isLoading,
    isTitlesLoading,
    isDetailsLoading,
    errorMessage,
    errorId,
    basePath,
    titlesByPath,
    repositoryMappings,
    originLastCommitByPath,
    originBranchByPath,
    openAppMetaByPath,
  } = dataSnapshot;
  const buildDataStoreLoadRequest = useCallback(
    () => ({
      context: {
        env: process.env,
        cwd: process.cwd(),
        homeDir: process.env.HOME?.trim() ?? null,
        assetsPath: environment.assetsPath,
        packageDir: __dirname,
        packageName: "worktree-deck",
      },
      displayCache: displayCacheRef.current,
      includeOriginEntries: displayMode === "show-all",
      dependencies: {
        initialSnapshot: WORKTREE_DECK_COMPOSITION_ROOT.loadWorktreeDeckInitialSnapshotDependencies,
        titlesSnapshot: WORKTREE_DECK_COMPOSITION_ROOT.loadWorktreeDeckTitlesSnapshotDependencies,
        detailsSnapshot: WORKTREE_DECK_COMPOSITION_ROOT.loadWorktreeDeckDetailsSnapshotDependencies,
        sessionFile: WORKTREE_DECK_COMPOSITION_ROOT.worktreeSessionFileDependencies,
      },
      logTiming,
      logWorktreeNames,
    }),
    [displayMode, logTiming, logWorktreeNames],
  );
  /**
   * 検索入力の更新をレンダリング外で反映する
   */
  const handleSearchTextChange = useCallback(
    (nextText: string) => {
      if (nextText === searchText) {
        return;
      }
      void Promise.resolve().then(() => {
        setSearchText((current) => (current === nextText ? current : nextText));
      });
    },
    [searchText, setSearchText],
  );
  const searchTerms = useMemo(() => parseSearchTerms(searchText), [searchText]);
  const archivedCodexSessionThreadIdSet = useMemo(() => {
    return new Set(archivedCodexSessionThreadIds.map((threadId) => threadId.trim()).filter(Boolean));
  }, [archivedCodexSessionThreadIds]);
  const visibleWorktrees = useMemo(
    () => filterVisibleWorktrees({ worktrees, hiddenPaths: hiddenWorktreePaths }),
    [hiddenWorktreePaths, worktrees],
  );
  const rawSections = useMemo(
    () => buildSectionsWithMappings(visibleWorktrees, repositoryMappings, displayMode, { titlesByPath }),
    [displayMode, visibleWorktrees, repositoryMappings, titlesByPath],
  );
  const applicablePinnedListOrder = isPinnedListOrderApplicable(pinnedListOrder, { basePath, displayMode })
    ? pinnedListOrder
    : null;
  const sections = useMemo(
    () =>
      buildSectionsWithMappings(visibleWorktrees, repositoryMappings, displayMode, {
        titlesByPath,
        sectionOrder: applicablePinnedListOrder?.sectionOrder,
      }),
    [applicablePinnedListOrder?.sectionOrder, displayMode, visibleWorktrees, repositoryMappings, titlesByPath],
  );
  const visibleSections = useMemo(() => {
    return sections
      .map((section) => {
        const entries = buildSortedSectionEntries({
          items: section.items,
          titlesByPath,
          mappedOrigins: section.mappedOrigins,
          originLastCommitByPath,
          originBranchByPath,
          includeOrigin: displayMode === "show-all",
          entryOrder: applicablePinnedListOrder?.entryOrder,
        });
        const filteredEntries = filterEntriesBySearchText(entries, section.repo, searchTerms);
        return { section, entries: filteredEntries };
      })
      .filter((entry) => entry.entries.length > 0);
  }, [
    applicablePinnedListOrder?.entryOrder,
    displayMode,
    originBranchByPath,
    originLastCommitByPath,
    searchTerms,
    sections,
    titlesByPath,
  ]);
  const selectionIndex = useMemo(() => buildSelectionIndex(visibleSections), [visibleSections]);
  /**
   * 表示中の選択 ID を保持し、起動復元完了後だけ永続化する
   */
  const handleSelectionChange = useCallback(
    (nextItemId: string | null): void => {
      const decision = resolveSelectionChangeDecision({
        phase: selectionPhase,
        currentItemId: selectedItemId,
        nextItemId,
      });
      if (decision === "ignore") {
        return;
      }
      const nextSelectedItemId = nextItemId?.trim() ?? null;
      if (!nextSelectedItemId) {
        return;
      }
      setSelectedItemId(nextSelectedItemId);
      const nextPersistedSelection = buildPersistedSelectionState({
        basePath,
        selectedItemId: nextSelectedItemId,
        selectionIndex,
      });
      if (!nextPersistedSelection || isSamePersistedSelectionState(persistedSelection, nextPersistedSelection)) {
        return;
      }
      setPersistedSelection(nextPersistedSelection);
      void WORKTREE_DECK_COMPOSITION_ROOT.selectionStore.savePersistedSelection(nextPersistedSelection);
    },
    [basePath, persistedSelection, selectedItemId, selectionIndex, selectionPhase],
  );
  const globalActionItems = useMemo(() => buildGlobalActionItems(), []);
  const globalActionById = useMemo(() => {
    return new Map<GlobalActionId, ReturnType<typeof buildGlobalActionItems>[number]>(
      globalActionItems.map((item) => [item.id, item]),
    );
  }, [globalActionItems]);
  const reloadWorktreesAction = globalActionById.get("reload-worktrees");
  const createWorktreeAction = globalActionById.get("create-worktree");
  const restoreDeletedWorktreeAction = globalActionById.get("restore-deleted-worktree");
  const settingsAction = globalActionById.get("settings");
  const extensionPreferencesAction = globalActionById.get("extension-preferences");
  const hasVisibleContent = visibleSections.length > 0;
  const isRepositoryMappingOnboardingEmptyState = shouldShowRepositoryMappingOnboardingEmptyState({
    searchText,
    mappings: repositoryMappings,
  });
  const isSelectionPreparing = selectionPhase === "loading-storage" || selectionPhase === "waiting-first-list";
  const selectedCreateInitialRepoRoot = useMemo(() => {
    if (!selectedItemId) {
      return null;
    }
    for (const { entries } of visibleSections) {
      for (const entry of entries) {
        if (resolveEntryItemId(entry) !== selectedItemId) {
          continue;
        }
        if (entry.kind === "origin") {
          return entry.originPath;
        }
        return resolveInitialRepoRoot({
          item: entry.item,
          mappings: repositoryMappings,
        });
      }
    }
    return null;
  }, [repositoryMappings, selectedItemId, visibleSections]);
  const controlledListSelectionItemId = useMemo(
    () =>
      resolveControlledListSelectionItemId({
        phase: selectionPhase,
        selectedItemId,
      }),
    [selectedItemId, selectionPhase],
  );
  useEffect(() => {
    displayCacheRef.current = displayCache;
  }, [displayCache]);
  useEffect(() => {
    if (isLoading || rawSections.length === 0) {
      return;
    }
    if (isPinnedListOrderApplicable(pinnedListOrder, { basePath, displayMode })) {
      return;
    }
    setPinnedListOrder(
      buildPinnedListOrder({
        basePath,
        displayMode,
        sections: rawSections,
        titlesByPath,
        originLastCommitByPath,
        originBranchByPath,
      }),
    );
  }, [
    basePath,
    displayMode,
    isLoading,
    originBranchByPath,
    originLastCommitByPath,
    pinnedListOrder,
    rawSections,
    titlesByPath,
  ]);
  useEffect(() => {
    void worktreeDeckDataStore.ensureLoaded(buildDataStoreLoadRequest());
  }, [buildDataStoreLoadRequest]);
  useEffect(() => {
    if (errorMessage === null || errorId <= lastShownErrorIdRef.current) {
      return;
    }
    lastShownErrorIdRef.current = errorId;
    void showToast({
      style: Toast.Style.Failure,
      title: "Failed to load worktrees",
      message: errorMessage,
    });
  }, [errorId, errorMessage]);
  useEffect(() => {
    setHiddenWorktreePaths((current) => {
      if (current.size === 0) {
        return current;
      }
      const listedPaths = new Set(listedWorktrees.map((item) => item.path));
      const next = new Set<string>();
      for (const path of current) {
        if (listedPaths.has(path)) {
          next.add(path);
        }
      }
      if (next.size === current.size) {
        return current;
      }
      return next;
    });
  }, [listedWorktrees]);
  useEffect(() => {
    let cancelled = false;
    void WORKTREE_DECK_COMPOSITION_ROOT.selectionStore.loadPersistedSelection().then((stored) => {
      if (cancelled) {
        return;
      }
      setPersistedSelection(stored);
      setSelectionPhase((current) => (current === "loading-storage" ? "waiting-first-list" : current));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const application = resolveInitialSelectionRestoreApplication({
      phase: selectionPhase,
      isLoading,
      currentBasePath: basePath,
      persistedSelection,
      selectionIndex,
    });
    if (!application) {
      return;
    }
    setSelectedItemId(application.selectedItemId);
    setSelectionPhase(application.phase);
  }, [basePath, isLoading, persistedSelection, selectionIndex, selectionPhase]);
  useEffect(() => {
    if (selectionPhase === "loading-storage" || selectionPhase === "waiting-first-list") {
      return;
    }
    const fallbackItemId = resolveFallbackSelectionItemId({
      selectedItemId,
      selectionIndex,
    });
    if (fallbackItemId === selectedItemId) {
      return;
    }
    setSelectedItemId(fallbackItemId);
  }, [selectedItemId, selectionIndex, selectionPhase]);
  useEffect(() => {
    const nextPhase = resolvePostLoadSelectionRestorePhase({
      phase: selectionPhase,
      isLoading,
      isTitlesLoading,
      isDetailsLoading,
    });
    if (nextPhase === selectionPhase) {
      return;
    }
    setSelectionPhase(nextPhase);
  }, [isDetailsLoading, isLoading, isTitlesLoading, selectionPhase]);
  useEffect(() => {
    const shouldScheduleUnlock = shouldScheduleInitialSelectionUnlock({
      phase: selectionPhase,
      isLoading,
      isTitlesLoading,
      isDetailsLoading,
      selectedItemId,
      availableItemIds: selectionIndex.itemIds,
    });
    if (!shouldScheduleUnlock) {
      selectionSettlingSignatureRef.current = null;
      return;
    }
    const signature = selectionIndex.signature;
    selectionSettlingSignatureRef.current = signature;
    const timerId = setTimeout(() => {
      if (selectionSettlingSignatureRef.current !== signature) {
        return;
      }
      setSelectionPhase((current) => (current === "settling-list" ? "ready" : current));
    }, 0);
    return () => {
      clearTimeout(timerId);
    };
  }, [
    isDetailsLoading,
    isLoading,
    isTitlesLoading,
    selectedItemId,
    selectionIndex.itemIds,
    selectionIndex.signature,
    selectionPhase,
  ]);
  useEffect(() => {
    const nextCache = buildWorktreeDeckDisplayCache({
      worktrees,
      titlesByPath,
      originLastCommitByPath,
      originBranchByPath,
      openAppMetaByPath,
    });
    if (!hasWorktreeDeckDisplayCacheData(nextCache)) {
      return;
    }
    if (isSameWorktreeDeckDisplayCache(displayCache, nextCache)) {
      return;
    }
    setDisplayCache(nextCache);
  }, [
    displayCache,
    openAppMetaByPath,
    originBranchByPath,
    originLastCommitByPath,
    setDisplayCache,
    titlesByPath,
    worktrees,
  ]);
  const refreshWorktrees = useCallback(async () => {
    setPinnedListOrder(null);
    await worktreeDeckDataStore.reload(buildDataStoreLoadRequest());
  }, [buildDataStoreLoadRequest]);

  /**
   * ユーザー操作で一覧を最新状態へ更新する
   */
  const handleReloadWorktrees = useCallback(() => {
    void refreshWorktrees();
  }, [refreshWorktrees]);

  const markRefreshOnPop = useCallback(() => {
    shouldRefreshOnPop.current = true;
  }, []);

  const handleCreatePop = useCallback(() => {
    if (!shouldRefreshOnPop.current) {
      return;
    }
    shouldRefreshOnPop.current = false;
    void refreshWorktrees();
  }, [refreshWorktrees]);

  /**
   * repository mapping 変更後にメイン一覧を更新する
   */
  const handleRepositoryMappingChange = useCallback(() => {
    markRefreshOnPop();
    void refreshWorktrees();
  }, [markRefreshOnPop, refreshWorktrees]);

  useEffect(() => {
    const shouldOpen = shouldAutoOpenRepositoryMappingOnboarding({
      isLoading,
      errorMessage,
      mappings: repositoryMappings,
      hasOpened: hasOpenedRepositoryMappingOnboardingRef.current,
    });
    if (!shouldOpen) {
      return;
    }
    hasOpenedRepositoryMappingOnboardingRef.current = true;
    push(<RepositoryMappingManager autoOpenAddForm onChange={handleRepositoryMappingChange} />, handleCreatePop);
  }, [errorMessage, handleCreatePop, handleRepositoryMappingChange, isLoading, push, repositoryMappings]);

  const handleRemoveWorktree = useCallback(
    async (args: { item: Worktree; deleteBranch: boolean; deleteRemoteBranch: boolean }): Promise<void> => {
      const repoRoot = args.item.originPath?.trim() || args.item.path;
      const worktreePath = args.item.path;
      let toast: Toast | null = null;
      setHiddenWorktreePaths((current) => new Set(current).add(worktreePath));
      try {
        toast = await showToast({ style: Toast.Style.Animated, title: "Starting worktree removal" });
        const result = await removeWorktreeUsecase.startBackgroundRemove({
          input: {
            repoRoot,
            worktreePath: args.item.path,
            assetsPath: environment.assetsPath,
            branch: args.item.branch,
            deleteBranch: args.deleteBranch,
            deleteRemoteBranch: args.deleteRemoteBranch,
          },
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.removeWorktreeDependencies,
        });
        try {
          const mapping = repositoryMappings.find((entry) => entry.repoRoot === repoRoot);
          await deletedWorktreesUsecase.recordDeletedWorktree({
            input: {
              repoRoot,
              repoName: args.item.repo,
              worktreePath,
              branch: args.item.branch,
              baseRef: args.item.baseRef ?? null,
              mapValue: mapping?.mapValue ?? args.item.repo,
              openApp: openAppMetaByPath.get(worktreePath)?.openApp ?? "zed",
              deleteBranch: args.deleteBranch,
            },
            dependencies: WORKTREE_DECK_COMPOSITION_ROOT.deletedWorktreeDependencies,
          });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to save restore history",
            message: formatExecErrorMessage(error),
          });
        }
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "Worktree removal started";
          toast.message = result.statePath;
        }
        await refreshWorktrees();
      } catch (error) {
        setHiddenWorktreePaths((current) => {
          if (!current.has(worktreePath)) {
            return current;
          }
          const next = new Set(current);
          next.delete(worktreePath);
          return next;
        });
        const message = formatExecErrorMessage(error);
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to remove worktree";
          toast.message = message;
          return;
        }
        try {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to remove worktree",
            message,
          });
        } catch {
          // 何もしない
        }
      }
    },
    [openAppMetaByPath, refreshWorktrees, repositoryMappings],
  );

  /**
   * worktree ブランチ名を変更する
   */
  const handleRenameWorktreeBranch = useCallback(
    async (args: { item: Worktree; newBranch: string; renameRemoteBranch: boolean }): Promise<void> => {
      const repoRoot = args.item.originPath?.trim() || args.item.path;
      const oldBranch = normalizeWorktreeBranchName(args.item.branch);
      if (!oldBranch) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to rename branch",
          message: "Current branch is not available.",
        });
        return;
      }
      const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming branch" });
      try {
        const result = await worktreeRenameUsecase.rename({
          input: {
            repoRoot,
            oldBranch,
            newBranch: args.newBranch,
            renameRemoteBranch: args.renameRemoteBranch,
          },
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.renameWorktreeBranchDependencies,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Branch renamed";
        toast.message = result.renamedRemoteBranch
          ? `${result.oldBranch} -> ${result.newBranch} (${result.remoteName})`
          : `${result.oldBranch} -> ${result.newBranch}`;
        await refreshWorktrees();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to rename branch";
        toast.message = formatExecErrorMessage(error);
      }
    },
    [refreshWorktrees],
  );

  /**
   * worktree ブランチを元ブランチへマージする
   */
  const handleMergeWorktree = useCallback(
    async (args: { item: Worktree; targetRef: string }): Promise<boolean> => {
      const repoRoot = args.item.originPath?.trim() || args.item.path;
      let mergePlan: WorktreeMergePlan;
      try {
        mergePlan = await worktreeMergeUsecase.buildPlan({
          repoRoot,
          worktreePath: args.item.path,
          targetRef: args.targetRef,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.buildWorktreeMergePlanDependencies,
        });
      } catch (error) {
        const message = formatExecErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to build merge plan",
          message,
        });
        return false;
      }

      const defaultBaseRef =
        await WORKTREE_DECK_COMPOSITION_ROOT.worktreeMergePreviewDependencies.loadDefaultBaseRef(repoRoot);
      const targetCounts = await WORKTREE_DECK_COMPOSITION_ROOT.worktreeMergePreviewDependencies.loadAheadBehindCounts({
        worktreePath: args.item.path,
        baseRef: mergePlan.targetRef,
      });

      const confirmed = await confirmAlert({
        title: `Merge into ${mergePlan.targetBranch}`,
        message: buildMergeConfirmationMessage({
          sourceBranch: mergePlan.sourceBranch,
          targetBranch: mergePlan.targetBranch,
          needsTrackingBranch: mergePlan.needsTrackingBranch,
          mergeStatus: args.item.mergeStatus ?? null,
          defaultBaseRef,
          behindCount: targetCounts?.behindCount ?? args.item.behindCount ?? null,
        }),
        primaryAction: { title: "Merge" },
        dismissAction: { title: "Cancel" },
      });
      if (!confirmed) {
        return false;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Merging worktree" });
      try {
        const result = await worktreeMergeUsecase.mergeIntoBase({
          plan: mergePlan,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.mergeWorktreeIntoBaseDependencies,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Merge completed";
        toast.message = `${result.sourceBranch} -> ${result.targetBranch}`;
        await refreshWorktrees();
        return true;
      } catch (error) {
        const message = formatExecErrorMessage(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to merge worktree";
        toast.message = message;
        return false;
      }
    },
    [refreshWorktrees],
  );

  /**
   * worktree ブランチの PR を作成する
   */
  const handleCreatePullRequest = useCallback(
    async (args: {
      item: Worktree;
      headBranch?: string | null;
      baseRef: string;
      title: string;
      description: string;
      draft: boolean;
      pushBeforeCreate: boolean;
    }): Promise<boolean> => {
      const repoRoot = args.item.originPath?.trim() || args.item.path;
      const headBranch = args.headBranch?.trim() || normalizeWorktreeBranchName(args.item.branch);
      let plan: Awaited<ReturnType<typeof worktreePullRequestUsecase.buildPlan>>;
      try {
        plan = await worktreePullRequestUsecase.buildPlan({
          repoRoot,
          worktreePath: args.item.path,
          baseRef: args.baseRef,
          headBranch,
          title: args.title,
          description: args.description,
          draft: args.draft,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.buildWorktreePullRequestPlanDependencies,
        });
      } catch (error) {
        const message = formatExecErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to prepare pull request",
          message,
        });
        return false;
      }

      const createPrDependencies = WORKTREE_DECK_COMPOSITION_ROOT.createWorktreePullRequestDependencies;
      let commitCount: number;
      try {
        commitCount = await createPrDependencies.countCommitsBetween({
          repoRoot: plan.repoRoot,
          baseRef: plan.baseRef,
          headRef: plan.headBranch,
        });
      } catch (error) {
        const message = formatExecErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to compare commits",
          message,
        });
        return false;
      }
      if (commitCount === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No commits between branches",
          message: `${plan.baseBranch} -> ${plan.headBranch}`,
        });
        return false;
      }

      const remoteName = plan.remoteName ?? (await createPrDependencies.resolvePreferredRemoteName(plan.repoRoot));
      if (!remoteName) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Remote is required",
        });
        return false;
      }
      const remoteExists = await createPrDependencies.checkRemoteBranchExists({
        repoRoot: plan.repoRoot,
        remoteName,
        branch: plan.headBranch,
      });
      if (!remoteExists) {
        if (!args.pushBeforeCreate) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Head branch is not on remote",
            message: plan.headBranch,
          });
          return false;
        }
        const pushToast = await showToast({ style: Toast.Style.Animated, title: "Pushing head branch" });
        try {
          await createPrDependencies.pushRemoteBranch({ repoRoot: plan.repoRoot, remoteName, branch: plan.headBranch });
          pushToast.style = Toast.Style.Success;
          pushToast.title = "Head branch pushed";
          pushToast.message = `${remoteName}/${plan.headBranch}`;
        } catch (error) {
          const message = formatExecErrorMessage(error);
          pushToast.style = Toast.Style.Failure;
          pushToast.title = "Failed to push head branch";
          pushToast.message = message;
          return false;
        }
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating pull request" });
      try {
        const result = await createPrDependencies.createWorktreePullRequest(plan);
        toast.style = Toast.Style.Success;
        toast.title = "Pull request created";
        toast.message = formatPullRequestToastMessage(result, `${plan.headBranch} -> ${plan.baseBranch}`);
        return true;
      } catch (error) {
        const message = formatExecErrorMessage(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create pull request";
        toast.message = message;
        return false;
      }
    },
    [],
  );

  /**
   * worktree ブランチを pull する
   */
  const handlePullWorktree = useCallback(
    async (args: { worktreePath: string; branch?: string | null }): Promise<boolean> => {
      const expectedBranch = normalizeWorktreeBranchName(args.branch);
      if (!expectedBranch) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Branch is not available",
        });
        return false;
      }
      let plan: Awaited<ReturnType<typeof worktreePullUsecase.buildPlan>>;
      try {
        plan = await worktreePullUsecase.buildPlan({
          worktreePath: args.worktreePath,
          expectedBranch,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.buildWorktreePullPlanDependencies,
        });
      } catch (error) {
        const message = formatExecErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to prepare pull",
          message,
        });
        return false;
      }
      const toast = await showToast({ style: Toast.Style.Animated, title: "Pulling worktree" });
      try {
        const result = await worktreePullUsecase.pull({
          plan,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.pullWorktreeDependencies,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Worktree updated";
        toast.message = `${result.branch} <- ${result.upstreamRef}`;
        await refreshWorktrees();
        return true;
      } catch (error) {
        const message = formatExecErrorMessage(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to pull worktree";
        toast.message = message;
        return false;
      }
    },
    [refreshWorktrees],
  );

  /**
   * マージフォームを開く前に同期済み worktree を止める
   */
  const handleOpenMergeWorktree = useCallback(
    async (item: Worktree): Promise<void> => {
      if (shouldBlockMergeFormForSyncedWorktree(item)) {
        await showToast({
          style: Toast.Style.Success,
          title: "Already synced",
          message: item.branch?.trim() || item.path,
        });
        return;
      }
      push(<MergeWorktreeForm item={item} onMerge={handleMergeWorktree} />);
    },
    [handleMergeWorktree, push],
  );

  /**
   * PR作成フォームを開く前にヘッドブランチを解決する
   */
  const handleOpenCreatePullRequest = useCallback(
    async (item: Worktree): Promise<void> => {
      try {
        const headBranch = await worktreePullRequestUsecase.resolveHeadBranch({
          worktreePath: item.path,
          headBranch: item.branch,
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.resolvePullRequestHeadBranchDependencies,
        });
        if (!headBranch) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Head branch is not available",
          });
          return;
        }
        push(<CreatePullRequestForm item={item} sourceBranch={headBranch} onCreate={handleCreatePullRequest} />);
      } catch (error) {
        const message = formatExecErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to resolve head branch",
          message,
        });
      }
    },
    [handleCreatePullRequest, push],
  );

  /**
   * 指定パスの最新セッションファイルを IDE で開く
   */
  const openLatestSessionForPath = useCallback(async (path: string): Promise<void> => {
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open session file",
        message: "Path is empty.",
      });
      return;
    }
    try {
      const result = await worktreeSessionFileUsecase.openLatestSessionFile({
        worktreePath: trimmedPath,
        context: {
          env: process.env,
          cwd: process.cwd(),
          homeDir: process.env.HOME?.trim() ?? null,
          assetsPath: environment.assetsPath,
          packageDir: __dirname,
          packageName: "worktree-deck",
        },
        dependencies: WORKTREE_DECK_COMPOSITION_ROOT.worktreeSessionFileDependencies,
      });
      if (result.status === "not-found") {
        await showToast({
          style: Toast.Style.Failure,
          title: "No session file found",
          message: "No session file found for this worktree.",
        });
        return;
      }
    } catch (error) {
      const message = formatExecErrorMessage(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open session file",
        message,
      });
    }
  }, []);

  /**
   * 保存済みの固定アプリで指定パスを開く
   */
  const openPathInConfiguredApp = useCallback(
    async (path: string, openApp: WorktreeOpenApp, threadId?: string | null): Promise<void> => {
      const label =
        openApp === "codex-app"
          ? worktreeOpenAppService.formatMetaLabel(openApp)
          : worktreeIdeAppService.formatIdeAppLabel(preferredIdeApp);
      const toast = await showToast({ style: Toast.Style.Animated, title: `Opening in ${label}` });
      try {
        const result = await worktreeOpenAppUsecase.openPreferred({
          command: { worktreePath: path, openApp, threadId },
          dependencies: WORKTREE_DECK_COMPOSITION_ROOT.openWorktreeInPreferredAppDependencies,
        });
        if (result.savedMeta !== null) {
          worktreeDeckDataStore.updateOpenAppMetaByPath(path, result.savedMeta);
        }
        toast.style = Toast.Style.Success;
        toast.title = `Opened in ${label}`;
        toast.message = result.preferenceSaved ? path.trim() : "Open preference could not be saved.";
        await closeMainWindow();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to open worktree";
        toast.message = formatExecErrorMessage(error);
      }
    },
    [preferredIdeApp],
  );

  /**
   * 保存済みの固定アプリを解決する
   */
  const resolveOpenAppForPath = useCallback(
    (path: string): WorktreeOpenApp => {
      return openAppMetaByPath.get(path)?.openApp ?? "zed";
    },
    [openAppMetaByPath],
  );

  /**
   * 保存済みの Codex thread id を解決する
   */
  const resolveThreadIdForPath = useCallback(
    (path: string): string | null => {
      return openAppMetaByPath.get(path)?.threadId ?? null;
    },
    [openAppMetaByPath],
  );

  /**
   * Codex App セッションを選択候補からアーカイブする
   */
  const archiveCodexSession = useCallback(
    async (threadId: string): Promise<void> => {
      const normalizedThreadId = worktreeOpenAppService.normalizeThreadId(threadId);
      if (!normalizedThreadId) {
        throw new Error("Invalid thread id.");
      }
      setArchivedCodexSessionThreadIds((current) => {
        const next = new Set(current.map((value) => value.trim()).filter(Boolean));
        next.add(normalizedThreadId);
        return Array.from(next).sort();
      });
      await showToast({ style: Toast.Style.Success, title: "Session archived" });
    },
    [setArchivedCodexSessionThreadIds],
  );

  /**
   * Codex App セッションをアーカイブ候補から復元する
   */
  const unarchiveCodexSession = useCallback(
    async (threadId: string): Promise<void> => {
      const normalizedThreadId = worktreeOpenAppService.normalizeThreadId(threadId);
      if (!normalizedThreadId) {
        throw new Error("Invalid thread id.");
      }
      setArchivedCodexSessionThreadIds((current) => {
        return current.map((value) => value.trim()).filter((value) => value && value !== normalizedThreadId);
      });
      await showToast({ style: Toast.Style.Success, title: "Session restored" });
    },
    [setArchivedCodexSessionThreadIds],
  );

  /**
   * 指定された起動アプリとセッション数に応じた Open アクションを構築する
   */
  const renderOpenActionItem = useCallback(
    (args: {
      path: string;
      openApp: WorktreeOpenApp;
      threadId: string | null;
      sessions: WorktreeTitle[];
      title: string;
      intent: OpenActionIntent;
    }) => {
      if (!shouldSelectCodexSessionForOpenAction({ openApp: args.openApp, intent: args.intent })) {
        return (
          <Action
            title={formatOpenActionTitle(args.openApp, preferredIdeApp)}
            icon={resolveOpenAppIcon(args.openApp)}
            shortcut={resolveOpenActionShortcut(args.intent)}
            onAction={() => void openPathInConfiguredApp(args.path, args.openApp, args.threadId)}
          />
        );
      }

      const plan = resolveCodexSessionOpenPlan({
        sessions: args.sessions,
        storedThreadId: args.threadId,
        archivedThreadIds: archivedCodexSessionThreadIdSet,
      });
      if (plan.kind === "select") {
        const archivedEntries = buildCodexSessionEntries(args.sessions, {
          archivedThreadIds: archivedCodexSessionThreadIdSet,
          visibility: "archived",
        });
        return (
          <Action.Push
            title={formatCodexSessionSelectActionTitle()}
            icon={resolveOpenAppIcon("codex-app")}
            target={
              <CodexSessionSelectView
                title={args.title}
                worktreePath={args.path}
                entries={plan.entries}
                archivedEntries={archivedEntries}
                onArchiveSession={archiveCodexSession}
                onUnarchiveSession={unarchiveCodexSession}
                onOpenSession={(threadId) => openPathInConfiguredApp(args.path, "codex-app", threadId)}
                ideAppTitle={worktreeIdeAppService.formatIdeAppLabel(preferredIdeApp)}
                onOpenWorktreeInZed={() => openPathInConfiguredApp(args.path, "zed", null)}
              />
            }
          />
        );
      }

      const resolvedThreadId = plan.kind === "open-thread" ? plan.threadId : null;
      return (
        <Action
          title={formatOpenActionTitle(args.openApp, preferredIdeApp)}
          icon={resolveOpenAppIcon(args.openApp)}
          shortcut={resolveOpenActionShortcut(args.intent)}
          onAction={() => void openPathInConfiguredApp(args.path, args.openApp, resolvedThreadId)}
        />
      );
    },
    [
      archiveCodexSession,
      archivedCodexSessionThreadIdSet,
      openPathInConfiguredApp,
      preferredIdeApp,
      unarchiveCodexSession,
    ],
  );

  /**
   * 保存済みアプリと逆側アプリの Open アクションを構築する
   */
  const renderOpenActions = useCallback(
    (args: {
      path: string;
      openApp: WorktreeOpenApp;
      threadId: string | null;
      sessions: WorktreeTitle[];
      title: string;
    }) => {
      const plans = buildOpenActionPlans({ openApp: args.openApp, threadId: args.threadId });
      const configuredPlan = plans[0];
      const alternatePlan = plans[OPEN_ALTERNATE_APP_ACTION_INDEX];
      return (
        <>
          {renderOpenActionItem({
            ...args,
            openApp: configuredPlan.openApp,
            threadId: configuredPlan.threadId,
            intent: configuredPlan.intent,
          })}
          {renderOpenActionItem({
            ...args,
            openApp: alternatePlan.openApp,
            threadId: alternatePlan.threadId,
            intent: alternatePlan.intent,
          })}
        </>
      );
    },
    [renderOpenActionItem],
  );

  /**
   * Create Worktree フォームを現在の repository 初期値付きで開く Action を返す
   */
  const renderCreateWorktreeAction = useCallback(
    (args: { initialRepoRoot?: string | null }) => {
      if (!createWorktreeAction) {
        return null;
      }
      const initialRepoRoot = args.initialRepoRoot?.trim() || null;
      return (
        <Action
          title={createWorktreeAction.title}
          icon={Icon.PlusCircle}
          shortcut={createWorktreeAction.shortcut}
          onAction={() => {
            push(<CreateWorktreeForm initialRepoRoot={initialRepoRoot} onComplete={refreshWorktrees} />);
          }}
        />
      );
    },
    [createWorktreeAction, push, refreshWorktrees],
  );

  /**
   * 一覧内で常に表示するアクション群
   */
  const renderGlobalActions = useCallback(
    (args: { initialRepoRoot?: string | null; includeCreateWorktree?: boolean } = {}) => {
      const includeCreateWorktree = args.includeCreateWorktree ?? true;
      return (
        <>
          <Action
            title="Toggle Display Mode"
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={() => setDisplayMode((current) => toggleDisplayMode(current))}
          />
          {reloadWorktreesAction ? (
            <Action
              title={reloadWorktreesAction.title}
              icon={Icon.ArrowClockwise}
              shortcut={reloadWorktreesAction.shortcut}
              onAction={handleReloadWorktrees}
            />
          ) : null}
          {includeCreateWorktree ? renderCreateWorktreeAction({ initialRepoRoot: args.initialRepoRoot }) : null}
          {restoreDeletedWorktreeAction ? (
            <Action.Push
              title={restoreDeletedWorktreeAction.title}
              icon={Icon.ArrowClockwise}
              shortcut={restoreDeletedWorktreeAction.shortcut}
              target={<RestoreDeletedWorktreeView onComplete={refreshWorktrees} />}
              onPop={handleCreatePop}
            />
          ) : null}
          {settingsAction ? (
            <Action.Push
              title={settingsAction.title}
              icon={Icon.Gear}
              shortcut={settingsAction.shortcut}
              target={
                <SettingsView
                  onGeneralSettingsChange={setPreferredIdeApp}
                  onRepositoryMappingChange={handleRepositoryMappingChange}
                />
              }
              onPop={handleCreatePop}
            />
          ) : null}
          {extensionPreferencesAction ? (
            <Action
              title={extensionPreferencesAction.title}
              icon={Icon.Gear}
              shortcut={extensionPreferencesAction.shortcut}
              onAction={() => void openExtensionPreferences()}
            />
          ) : null}
        </>
      );
    },
    [
      createWorktreeAction,
      extensionPreferencesAction,
      handleCreatePop,
      handleReloadWorktrees,
      handleRepositoryMappingChange,
      refreshWorktrees,
      reloadWorktreesAction,
      renderCreateWorktreeAction,
      settingsAction,
      restoreDeletedWorktreeAction,
      setDisplayMode,
      setPreferredIdeApp,
    ],
  );

  /**
   * 初回 repository 追加アクションを描画する
   */
  const renderAddRepositoryMappingAction = useCallback(() => {
    if (!settingsAction) {
      return null;
    }
    return (
      <Action.Push
        title="Add Repository Mapping"
        icon={Icon.PlusCircle}
        target={<RepositoryMappingManager autoOpenAddForm onChange={handleRepositoryMappingChange} />}
        onPop={handleCreatePop}
      />
    );
  }, [handleCreatePop, handleRepositoryMappingChange, settingsAction]);

  /**
   * 選択中アイテムの詳細ペイン表示位置を更新する
   */
  const handleScrollDetail = useCallback(
    (args: { itemId: string; markdown: string; direction: DetailScrollDirection }): void => {
      setDetailScrollOffsetsByItemId((current) => {
        const currentOffset = current[args.itemId] ?? 0;
        const nextOffset = resolveNextDetailScrollOffset({
          markdown: args.markdown,
          currentOffset,
          direction: args.direction,
        });
        if (nextOffset === currentOffset) {
          return current;
        }
        return { ...current, [args.itemId]: nextOffset };
      });
    },
    [],
  );

  /**
   * 詳細ペインを一覧選択とは独立して送るアクションを描画する
   */
  const renderDetailScrollActions = useCallback(
    (args: { itemId: string; markdown: string }) => {
      return (
        <>
          <Action
            title="Scroll Upward"
            icon={Icon.ArrowUp}
            shortcut={SCROLL_DETAIL_UP_SHORTCUT}
            onAction={() => handleScrollDetail({ ...args, direction: "up" })}
          />
          <Action
            title="Scroll Downward"
            icon={Icon.ArrowDown}
            shortcut={SCROLL_DETAIL_DOWN_SHORTCUT}
            onAction={() => handleScrollDetail({ ...args, direction: "down" })}
          />
        </>
      );
    },
    [handleScrollDetail],
  );

  return (
    <List
      isLoading={isLoading || isSelectionPreparing}
      searchBarPlaceholder="Search worktrees"
      searchBarAccessory={
        <List.Dropdown
          id={DISPLAY_MODE_DROPDOWN_ID}
          tooltip="Display Mode"
          value={displayMode}
          onChange={(newValue) => {
            setDisplayMode(parseDisplayMode(newValue));
          }}
        >
          <List.Dropdown.Item title="Show All" value="show-all" />
          <List.Dropdown.Item title="Worktrees Only" value="worktrees-only" />
        </List.Dropdown>
      }
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={controlledListSelectionItemId}
      onSelectionChange={handleSelectionChange}
      filtering={false}
      isShowingDetail
    >
      {isSelectionPreparing ? null : errorMessage ? (
        <List.Section title="Status">
          <List.Item
            title="Failed to load worktrees"
            subtitle={errorMessage}
            icon={Icon.Warning}
            actions={
              <ActionPanel>{renderGlobalActions({ initialRepoRoot: selectedCreateInitialRepoRoot })}</ActionPanel>
            }
          />
        </List.Section>
      ) : !hasVisibleContent ? (
        <List.EmptyView
          title={
            searchText.trim()
              ? "No matching worktrees"
              : isRepositoryMappingOnboardingEmptyState
                ? "Add your first repository"
                : "No worktrees"
          }
          description={
            searchText.trim()
              ? "No worktrees matched your search."
              : isRepositoryMappingOnboardingEmptyState
                ? "Register a repository path to start tracking worktrees."
                : basePath
                  ? `No worktrees were found under ${basePath}.`
                  : "No worktrees were found."
          }
          icon={isRepositoryMappingOnboardingEmptyState ? Icon.PlusCircle : Icon.Folder}
          actions={
            <ActionPanel>
              {isRepositoryMappingOnboardingEmptyState ? renderAddRepositoryMappingAction() : null}
              {renderGlobalActions({ initialRepoRoot: selectedCreateInitialRepoRoot })}
            </ActionPanel>
          }
        />
      ) : (
        visibleSections.map(({ section, entries }) => {
          return (
            <List.Section key={section.repo} title={section.repo}>
              {entries.map((entry) => {
                const itemId = resolveEntryItemId(entry);
                if (entry.kind === "origin") {
                  const openApp = resolveOpenAppForPath(entry.originPath);
                  const threadId = resolveThreadIdForPath(entry.originPath);
                  const status = resolveWorktreeStatus(entry.titles);
                  const statusTint = resolveStatusTint({ status, titles: entry.titles });
                  const originBranch = formatBranchTitle({ branch: entry.branch ?? "origin", titles: entry.titles });
                  const rawDetailMarkdown = buildDetailMarkdown({
                    title: originBranch,
                    titles: entry.titles,
                    isTitlesLoading,
                    lastCommitAt: entry.lastCommitAt,
                    openApp,
                    useLastCommitSeparator: false,
                  });
                  const detailMarkdown = buildScrollableDetailMarkdown(
                    rawDetailMarkdown,
                    detailScrollOffsetsByItemId[itemId] ?? 0,
                  );
                  return (
                    <List.Item
                      key={itemId}
                      id={itemId}
                      title={originBranch}
                      keywords={buildSearchKeywords({
                        repo: section.repo,
                        originPath: entry.originPath,
                        branch: entry.branch,
                      })}
                      icon={{ source: Icon.House, tintColor: statusTint }}
                      accessories={buildOpenAppAccessory(openApp, preferredIdeApp)}
                      detail={<List.Item.Detail markdown={detailMarkdown} />}
                      actions={
                        <ActionPanel>
                          {renderOpenActions({
                            path: entry.originPath,
                            openApp,
                            threadId,
                            sessions: entry.titles,
                            title: originBranch,
                          })}
                          {renderCreateWorktreeAction({ initialRepoRoot: entry.originPath })}
                          <Action.Push
                            title="Show Details"
                            icon={Icon.Eye}
                            shortcut={SHOW_DETAILS_SHORTCUT}
                            target={
                              <SessionDetailView
                                title={originBranch}
                                sessions={entry.titles}
                                homeDir={process.env.HOME?.trim() ?? null}
                              />
                            }
                          />
                          {renderDetailScrollActions({ itemId, markdown: rawDetailMarkdown })}
                          <Action
                            title="Create Pull Request"
                            icon={Icon.Upload}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                            onAction={() =>
                              void handleOpenCreatePullRequest({
                                repo: section.repo,
                                path: entry.originPath,
                                branch: entry.branch ?? undefined,
                              })
                            }
                          />
                          {canPullBranch(entry.branch) ? (
                            <Action
                              title="Pull Worktree"
                              icon={Icon.Download}
                              onAction={() =>
                                void handlePullWorktree({ worktreePath: entry.originPath, branch: entry.branch })
                              }
                            />
                          ) : null}
                          <Action
                            title="Open Latest Session File"
                            icon={Icon.Clock}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                            onAction={() => void openLatestSessionForPath(entry.originPath)}
                          />
                          <Action.ShowInFinder path={entry.originPath} icon={Icon.Folder} />
                          <Action.CopyToClipboard
                            title="Copy Origin Path"
                            icon={Icon.Clipboard}
                            content={entry.originPath}
                          />
                          {renderGlobalActions({
                            initialRepoRoot: entry.originPath,
                            includeCreateWorktree: false,
                          })}
                        </ActionPanel>
                      }
                    />
                  );
                }

                const item = entry.item;
                const openApp = resolveOpenAppForPath(item.path);
                const threadId = resolveThreadIdForPath(item.path);
                const titles = item.titleEntries ?? [];
                const branchTitle = formatBranchTitle({ branch: item.branch, titles });
                const rawDetailMarkdown = buildDetailMarkdown({
                  title: branchTitle,
                  titles,
                  isTitlesLoading,
                  mergeStatus: item.mergeStatus,
                  lastCommitAt: item.lastCommitAt ?? null,
                  mergeStatusError: item.mergeStatusError ?? null,
                  baseRef: item.baseRef ?? null,
                  aheadCount: item.aheadCount ?? null,
                  behindCount: item.behindCount ?? null,
                  openApp,
                });
                const detailMarkdown = buildScrollableDetailMarkdown(
                  rawDetailMarkdown,
                  detailScrollOffsetsByItemId[itemId] ?? 0,
                );
                const canRemoveWorktree = canRemoveWorktreeItem(item);
                const canMergeWorktree = item.originPath ? item.originPath !== item.path : false;
                const canRenameBranch = normalizeWorktreeBranchName(item.branch) !== null;
                const canCreatePullRequest = Boolean(item.branch?.trim());
                const canPullWorktree = canPullBranch(item.branch);
                const status = resolveWorktreeStatus(titles);
                const statusTint = resolveStatusTint({ status, titles });
                return (
                  <List.Item
                    key={itemId}
                    id={itemId}
                    title={branchTitle}
                    keywords={buildSearchKeywords({
                      repo: item.repo,
                      originPath: item.originPath,
                      branch: item.branch,
                    })}
                    icon={{ source: Icon.Folder, tintColor: statusTint }}
                    accessories={buildOpenAppAccessory(openApp, preferredIdeApp)}
                    detail={<List.Item.Detail markdown={detailMarkdown} />}
                    actions={
                      <ActionPanel>
                        {renderOpenActions({
                          path: item.path,
                          openApp,
                          threadId,
                          sessions: titles,
                          title: branchTitle,
                        })}
                        {renderCreateWorktreeAction({
                          initialRepoRoot: resolveInitialRepoRoot({ item, mappings: repositoryMappings }),
                        })}
                        <Action.Push
                          title="Show Details"
                          icon={Icon.Eye}
                          shortcut={SHOW_DETAILS_SHORTCUT}
                          target={
                            <SessionDetailView
                              title={branchTitle}
                              sessions={titles}
                              homeDir={process.env.HOME?.trim() ?? null}
                            />
                          }
                        />
                        {renderDetailScrollActions({ itemId, markdown: rawDetailMarkdown })}
                        {canPullWorktree ? (
                          <Action
                            title="Pull Worktree"
                            icon={Icon.Download}
                            onAction={() => void handlePullWorktree({ worktreePath: item.path, branch: item.branch })}
                          />
                        ) : null}
                        <Action
                          title="Open Latest Session File"
                          icon={Icon.Clock}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                          onAction={() => void openLatestSessionForPath(item.path)}
                        />
                        <Action.ShowInFinder path={item.path} icon={Icon.Folder} />
                        <Action.CopyToClipboard title="Copy Path" icon={Icon.Clipboard} content={item.path} />
                        <Action.CopyToClipboard title="Copy Repository" icon={Icon.Clipboard} content={item.repo} />
                        {item.originPath ? (
                          <Action.CopyToClipboard
                            title="Copy Origin Path"
                            icon={Icon.Clipboard}
                            content={item.originPath}
                          />
                        ) : null}
                        {item.branch ? (
                          <Action.CopyToClipboard title="Copy Branch" icon={Icon.Clipboard} content={item.branch} />
                        ) : null}
                        {canCreatePullRequest ? (
                          <Action
                            title="Create Pull Request"
                            icon={Icon.Upload}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                            onAction={() => void handleOpenCreatePullRequest(item)}
                          />
                        ) : null}
                        {canMergeWorktree ? (
                          <Action
                            title="Merge into Base Branch"
                            icon={Icon.ArrowRightCircle}
                            shortcut={{ modifiers: ["cmd"], key: "m" }}
                            onAction={() => void handleOpenMergeWorktree(item)}
                          />
                        ) : null}
                        {canRenameBranch ? (
                          <Action
                            title="Rename Branch"
                            icon={Icon.Pencil}
                            onAction={() =>
                              push(<RenameWorktreeForm item={item} onRename={handleRenameWorktreeBranch} />)
                            }
                          />
                        ) : null}
                        {canRemoveWorktree ? (
                          <Action
                            title="Remove Worktree"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={{ modifiers: ["cmd"], key: "d" }}
                            onAction={() => push(<RemoveWorktreeForm item={item} onRemove={handleRemoveWorktree} />)}
                          />
                        ) : null}
                        {renderGlobalActions({
                          initialRepoRoot: resolveInitialRepoRoot({ item, mappings: repositoryMappings }),
                          includeCreateWorktree: false,
                        })}
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })
      )}
    </List>
  );
}

/**
 * 非表示対象を除いた worktree 一覧を返す
 */
export function filterVisibleWorktrees(args: { worktrees: Worktree[]; hiddenPaths: Set<string> }): Worktree[] {
  if (args.hiddenPaths.size === 0) {
    return args.worktrees;
  }
  return args.worktrees.filter((item) => !args.hiddenPaths.has(item.path));
}

/**
 * 削除対象として扱える worktree か判定する
 */
export function canRemoveWorktreeItem(item: Worktree): boolean {
  const originPath = item.originPath?.trim();
  if (!originPath) {
    return true;
  }
  return originPath !== item.path;
}

/**
 * 同期済み worktree のマージフォーム起動を止めるか判定する
 */
export function shouldBlockMergeFormForSyncedWorktree(item: Worktree): boolean {
  return item.mergeStatus === "synced";
}

/**
 * worktree 作成フォームへ渡す初期 repository root を解決する
 */
export function resolveInitialRepoRoot(args: { item: Worktree; mappings: RepositoryMapping[] }): string {
  const originPath = args.item.originPath?.trim();
  if (originPath) {
    return originPath;
  }
  const mapped = args.mappings.find((mapping) => {
    const mapValue = mapping.mapValue?.trim();
    if (mapValue && mapValue === args.item.repo) {
      return true;
    }
    return resolvePathBasename(mapping.repoRoot) === args.item.repo;
  });
  return mapped?.repoRoot ?? args.item.path;
}

/**
 * 初回利用時に repository mapping 追加導線を自動表示するか判定する
 */
export function shouldAutoOpenRepositoryMappingOnboarding(args: {
  isLoading: boolean;
  errorMessage: string | null;
  mappings: RepositoryMapping[];
  hasOpened: boolean;
}): boolean {
  if (args.hasOpened || args.isLoading || args.errorMessage !== null) {
    return false;
  }
  return args.mappings.length === 0;
}

/**
 * repository mapping 未設定時の初回空状態を表示するか判定する
 */
export function shouldShowRepositoryMappingOnboardingEmptyState(args: {
  searchText: string;
  mappings: RepositoryMapping[];
}): boolean {
  return args.searchText.trim().length === 0 && args.mappings.length === 0;
}

/**
 * ステータスに応じた tint を返す
 */
export function resolveStatusTint(args: {
  status: WorktreeTitle["status"];
  titles: WorktreeTitle[];
}): Color | undefined {
  if (hasAnySessionWaitingForUser(args.titles)) {
    return Color.Yellow;
  }
  if (!args.status) {
    return undefined;
  }
  return resolveStatusColor(args.status);
}

/**
 * ステータス名を色に変換する
 */
function resolveStatusColor(status: string): Color {
  switch (status) {
    case "working":
      return Color.Green;
    case "done":
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
}

/**
 * 検索対象のキーワードを列挙する
 */
function buildSearchKeywords({
  repo,
  originPath,
  branch,
}: {
  repo: string;
  originPath?: string | null;
  branch?: string | null;
}): string[] {
  const keywords = [repo];
  if (branch) {
    keywords.push(branch);
  }
  if (originPath) {
    keywords.push(originPath);
  }
  // Raycastの検索対象を明示的に増やす
  return keywords;
}

/**
 * パス末尾の名前を返す
 */
function resolvePathBasename(path: string): string {
  const normalized = path.trim().replace(/\/+$/, "");
  const segments = normalized.split("/");
  return segments.at(-1) ?? normalized;
}

/**
 * PR作成結果の表示メッセージを組み立てる
 */
function formatPullRequestToastMessage(result: WorktreePullRequestResult, fallback: string): string {
  const url = result.url?.trim();
  if (url) {
    return url;
  }
  const stdout = result.stdout.trim();
  if (stdout) {
    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const lastLine = lines.length > 0 ? lines[lines.length - 1] : "";
    if (lastLine) {
      return lastLine;
    }
  }
  const stderr = result.stderr.trim();
  if (stderr) {
    return stderr;
  }
  return fallback;
}

/**
 * 参照名からブランチ名を抽出する
 */
function extractBranchNameFromRef(ref?: string | null): string | null {
  const trimmed = ref?.trim();
  if (!trimmed) {
    return null;
  }
  const headsPrefix = "refs/heads/";
  if (trimmed.startsWith(headsPrefix)) {
    const branch = trimmed.slice(headsPrefix.length).trim();
    return branch || null;
  }
  const remotesPrefix = "refs/remotes/";
  if (trimmed.startsWith(remotesPrefix)) {
    const rest = trimmed.slice(remotesPrefix.length);
    const splitIndex = rest.indexOf("/");
    const branch = splitIndex === -1 ? rest : rest.slice(splitIndex + 1);
    return branch.trim() || null;
  }
  if (trimmed.startsWith("origin/")) {
    const branch = trimmed.slice("origin/".length).trim();
    return branch || null;
  }
  return trimmed;
}

/**
 * マージ確認ダイアログ用の文面を組み立てる
 */
export function buildMergeConfirmationMessage(args: {
  sourceBranch: string;
  targetBranch: string;
  needsTrackingBranch: boolean;
  mergeStatus: WorktreeMergeStatus | null;
  defaultBaseRef: string | null;
  behindCount: number | null;
}): string {
  const statusHints: string[] = [];
  if (args.behindCount != null && args.behindCount > 0) {
    statusHints.push(`base +${args.behindCount}`);
  }
  const defaultBaseBranch = extractBranchNameFromRef(args.defaultBaseRef);
  if (defaultBaseBranch && defaultBaseBranch !== args.targetBranch) {
    statusHints.push(`not base (${defaultBaseBranch})`);
  }
  if (args.needsTrackingBranch) {
    statusHints.push("tracking create");
  }
  const lines = [`Source: ${args.sourceBranch}`];
  if (shouldShowMergeConfirmationGitStatus(args.mergeStatus)) {
    const statusLabel = formatMergeStatusLabel(args.mergeStatus ?? "unknown");
    const statusPrefix = args.mergeStatus === "dirty" ? "⚠️ " : "";
    const statusSuffix = statusHints.length > 0 ? ` (⚠️ ${statusHints.join(" / ")})` : "";
    lines.push("", "Git status:", `Status: ${statusPrefix}${statusLabel}${statusSuffix}`);
  }
  return lines.join("\n");
}

/**
 * 通常の not synced 以外で git 状態を確認表示に出すか判定する
 */
function shouldShowMergeConfirmationGitStatus(mergeStatus: WorktreeMergeStatus | null): boolean {
  return mergeStatus != null && mergeStatus !== "unmerged" && mergeStatus !== "synced";
}
