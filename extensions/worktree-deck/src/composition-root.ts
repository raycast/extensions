import type { AutoStartImageInputDependencies } from "./application/auto-start-image-input.usecase";
import type { CreateWorktreeDependencies } from "./application/create-worktree.usecase";
import type { DeletedWorktreeDependencies } from "./application/deleted-worktrees.usecase";
import type { GenerateWorktreeBranchNameDependencies } from "./application/generate-worktree-branch-name.usecase";
import type { ListWorktreesDependencies } from "./application/list-worktrees.usecase";
import type { OpenCodexAppDependencies } from "./application/open-codex-app.usecase";
import type { RemoveWorktreeDependencies } from "./application/remove-worktree.usecase";
import type { StartWorktreeAutoStartJobDependencies } from "./application/start-worktree-auto-start-job.usecase";
import type { StartCodexInitialSessionDependencies } from "./application/start-codex-initial-session.usecase";
import type { RenameWorktreeBranchDependencies } from "./application/worktree-rename.usecase";
import type {
  LoadWorktreeDeckDetailsSnapshotDependencies,
  LoadWorktreeDeckInitialSnapshotDependencies,
  LoadWorktreeDeckTitlesSnapshotDependencies,
} from "./application/worktree-deck-snapshot.usecase";
import type {
  BuildWorktreeMergePlanDependencies,
  MergeWorktreeIntoBaseDependencies,
} from "./application/worktree-merge.usecase";
import type { WorktreeMergeTargetOptionsDependencies } from "./application/worktree-merge-target-options.usecase";
import type { BuildWorktreePullPlanDependencies, PullWorktreeDependencies } from "./application/worktree-pull.usecase";
import type {
  BuildWorktreePullRequestPlanDependencies,
  CreateWorktreePullRequestDependencies,
  ResolvePullRequestHeadBranchDependencies,
  ResolveWorktreePullRequestTitleDependencies,
  WorktreePullRequestResult,
} from "./application/worktree-pull-request.usecase";
import type { WorktreeSessionFileDependencies } from "./application/worktree-session-file.usecase";
import type { OpenWorktreeInPreferredAppDependencies } from "./application/worktree-open-app.usecase";
import type { WorktreeMenuBarLifecycleDependencies } from "./application/worktree-menu-bar-lifecycle.usecase";
import type { WorktreeMenuBarSummaryStore } from "./interface-adapters/worktree-menu-bar-summary-dependencies";
import type { SessionMessage } from "./domain/session-detail.service";
import type { Worktree } from "./application/worktree.entity";
import type { WorktreeTitle } from "./application/worktree-title.entity";
import { createDefaultWorktreeDependencies } from "./interface-adapters/create-worktree-dependencies";
import { createDefaultDeletedWorktreeDependencies } from "./interface-adapters/deleted-worktrees-dependencies";
import { createDefaultGenerateWorktreeBranchNameDependencies } from "./interface-adapters/generate-worktree-branch-name-dependencies";
import { createDefaultListWorktreesDependencies } from "./interface-adapters/list-worktrees-dependencies";
import { createDefaultOpenCodexAppDependencies } from "./interface-adapters/open-codex-app-dependencies";
import { createDefaultRemoveWorktreeDependencies } from "./interface-adapters/remove-worktree-dependencies";
import { createDefaultWorktreeAutoStartJobDependencies } from "./interface-adapters/start-worktree-auto-start-job-dependencies";
import { createDefaultAutoStartImageInputDependencies } from "./interface-adapters/auto-start-image-input-dependencies";
import { createDefaultStartCodexInitialSessionDependencies } from "./interface-adapters/start-codex-initial-session-dependencies";
import { createDefaultWorktreeRenameDependencies } from "./interface-adapters/worktree-rename-dependencies";
import { createDefaultWorktreeMenuBarLifecycleDependencies } from "./interface-adapters/worktree-menu-bar-lifecycle-dependencies";
import { createDefaultWorktreeMenuBarSummaryStore } from "./interface-adapters/worktree-menu-bar-summary-dependencies";
import { listWorktreesUsecase } from "./application/list-worktrees.usecase";
import { applyWorktreeDeckDisplayCache } from "./application/worktree-deck-display-cache";
import {
  createBuildWorktreeMergePlanDependencies,
  createMergeWorktreeIntoBaseDependencies,
  createWorktreeMergeInfra,
} from "./interface-adapters/worktree-merge-dependencies";
import {
  attachWorktreeTitles,
  listMergeTargetRefs,
  loadAheadBehindCounts,
  loadCurrentBranchByPath,
  loadDefaultBaseRef,
  loadLastCommitAtByPath,
  loadTitlesForPaths,
  loadWorktreeMetadata,
  resolveMergeTargetRef,
} from "./infrastructure/worktree-store";
import {
  loadBaseRefByWorktreePath,
  loadBaseRefForBranchConfig,
  loadBaseRefForWorktreePath,
  saveBaseRefForBranchConfig,
  saveBaseRefForWorktreePath,
} from "./infrastructure/worktree-base-ref-store";
import { listLocalBranches } from "./infrastructure/worktree-create-store";
import {
  findFirstSessionFileByPath,
  findLatestSessionFileByPath,
  loadLatestSessionMessages,
  loadSessionMessages,
} from "./infrastructure/codex-session-file-store";
import {
  loadPreferredIdeApp,
  openPathInConfiguredIde,
  savePreferredIdeApp,
} from "./infrastructure/worktree-ide-app-store";
import {
  createDefaultBuildWorktreePullPlanDependencies,
  createDefaultPullWorktreeDependencies,
} from "./infrastructure/worktree-pull-infra";
import {
  createDefaultBuildWorktreePullRequestPlanDependencies,
  createDefaultCreateWorktreePullRequestDependencies,
  createDefaultResolvePullRequestHeadBranchDependencies,
  createDefaultResolveWorktreePullRequestTitleDependencies,
} from "./infrastructure/worktree-pr-infra";
import { openPathInCodexApp, openCodexThreadInApp } from "./infrastructure/codex-app-infra";
import {
  loadOpenAppMetaByWorktreePath,
  saveOpenAppMetaForWorktreePath,
  saveCodexThreadIdForWorktreePath,
  saveOpenAppForWorktreePath,
} from "./infrastructure/worktree-open-app-store";
import { loadRepositoryMappings, saveRepositoryMappings } from "./infrastructure/repository-mapping-store";
import {
  loadPersistedSelectionFromStorage,
  savePersistedSelectionToStorage,
} from "./infrastructure/worktree-deck-selection-store";

export type WorktreeMergeStatus = NonNullable<Worktree["mergeStatus"]>;
export type WorktreeSection = {
  repo: string;
  items: Worktree[];
};
export type { SessionMessage, Worktree, WorktreePullRequestResult, WorktreeTitle };

/**
 * worktree-deck で利用する依存解決結果
 */
type WorktreeDeckCompositionRoot = {
  listWorktreesDependencies: ListWorktreesDependencies;
  removeWorktreeDependencies: RemoveWorktreeDependencies;
  deletedWorktreeDependencies: DeletedWorktreeDependencies;
  renameWorktreeBranchDependencies: RenameWorktreeBranchDependencies;
  createWorktreeDependencies: CreateWorktreeDependencies;
  autoStartImageInputDependencies: AutoStartImageInputDependencies;
  startWorktreeAutoStartJobDependencies: StartWorktreeAutoStartJobDependencies;
  generateWorktreeBranchNameDependencies: GenerateWorktreeBranchNameDependencies;
  startCodexInitialSessionDependencies: StartCodexInitialSessionDependencies;
  openCodexAppDependencies: OpenCodexAppDependencies;
  buildWorktreeMergePlanDependencies: BuildWorktreeMergePlanDependencies;
  mergeWorktreeIntoBaseDependencies: MergeWorktreeIntoBaseDependencies;
  buildWorktreePullPlanDependencies: BuildWorktreePullPlanDependencies;
  pullWorktreeDependencies: PullWorktreeDependencies;
  resolvePullRequestHeadBranchDependencies: ResolvePullRequestHeadBranchDependencies;
  buildWorktreePullRequestPlanDependencies: BuildWorktreePullRequestPlanDependencies;
  createWorktreePullRequestDependencies: CreateWorktreePullRequestDependencies;
  resolveWorktreePullRequestTitleDependencies: ResolveWorktreePullRequestTitleDependencies;
  worktreeMergeTargetOptionsDependencies: WorktreeMergeTargetOptionsDependencies;
  worktreeSessionFileDependencies: WorktreeSessionFileDependencies;
  openWorktreeInPreferredAppDependencies: OpenWorktreeInPreferredAppDependencies;
  worktreeMenuBarLifecycleDependencies: WorktreeMenuBarLifecycleDependencies;
  worktreeMenuBarSummaryStore: WorktreeMenuBarSummaryStore;
  worktreeMergePreviewDependencies: {
    loadDefaultBaseRef: typeof loadDefaultBaseRef;
    loadAheadBehindCounts: typeof loadAheadBehindCounts;
  };
  createWorktreeFormDependencies: {
    listLocalBranches: typeof listLocalBranches;
    loadDefaultBaseRef: typeof loadDefaultBaseRef;
    saveBaseRefForBranchConfig: typeof saveBaseRefForBranchConfig;
    saveBaseRefForWorktreePath: typeof saveBaseRefForWorktreePath;
    saveOpenAppForWorktreePath: typeof saveOpenAppForWorktreePath;
  };
  loadWorktreeDeckInitialSnapshotDependencies: LoadWorktreeDeckInitialSnapshotDependencies;
  loadWorktreeDeckTitlesSnapshotDependencies: LoadWorktreeDeckTitlesSnapshotDependencies;
  loadWorktreeDeckDetailsSnapshotDependencies: LoadWorktreeDeckDetailsSnapshotDependencies;
  repositoryMappingStore: {
    loadRepositoryMappings: typeof loadRepositoryMappings;
    saveRepositoryMappings: typeof saveRepositoryMappings;
  };
  generalSettingsStore: {
    loadPreferredIdeApp: typeof loadPreferredIdeApp;
    savePreferredIdeApp: typeof savePreferredIdeApp;
  };
  selectionStore: {
    loadPersistedSelection: typeof loadPersistedSelectionFromStorage;
    savePersistedSelection: typeof savePersistedSelectionToStorage;
  };
};

/**
 * worktree-deck の依存を1箇所で組み立てる
 */
function createWorktreeDeckCompositionRoot(): WorktreeDeckCompositionRoot {
  const listWorktreesDependencies = createDefaultListWorktreesDependencies();
  const worktreeMergeInfra = createWorktreeMergeInfra({
    resolveMergeTargetRef,
  });
  return {
    listWorktreesDependencies,
    removeWorktreeDependencies: createDefaultRemoveWorktreeDependencies(),
    deletedWorktreeDependencies: createDefaultDeletedWorktreeDependencies(),
    renameWorktreeBranchDependencies: createDefaultWorktreeRenameDependencies(),
    createWorktreeDependencies: createDefaultWorktreeDependencies(),
    autoStartImageInputDependencies: createDefaultAutoStartImageInputDependencies(),
    startWorktreeAutoStartJobDependencies: createDefaultWorktreeAutoStartJobDependencies(),
    generateWorktreeBranchNameDependencies: createDefaultGenerateWorktreeBranchNameDependencies(),
    startCodexInitialSessionDependencies: createDefaultStartCodexInitialSessionDependencies(),
    openCodexAppDependencies: createDefaultOpenCodexAppDependencies(),
    buildWorktreeMergePlanDependencies: createBuildWorktreeMergePlanDependencies(worktreeMergeInfra),
    mergeWorktreeIntoBaseDependencies: createMergeWorktreeIntoBaseDependencies(worktreeMergeInfra),
    buildWorktreePullPlanDependencies: createDefaultBuildWorktreePullPlanDependencies(),
    pullWorktreeDependencies: createDefaultPullWorktreeDependencies(),
    resolvePullRequestHeadBranchDependencies: createDefaultResolvePullRequestHeadBranchDependencies(),
    buildWorktreePullRequestPlanDependencies: createDefaultBuildWorktreePullRequestPlanDependencies(),
    createWorktreePullRequestDependencies: createDefaultCreateWorktreePullRequestDependencies(),
    resolveWorktreePullRequestTitleDependencies: createDefaultResolveWorktreePullRequestTitleDependencies(),
    worktreeMergeTargetOptionsDependencies: {
      listMergeTargetRefs,
      resolveMergeTargetRef,
      loadBaseRefForBranchConfig,
      loadBaseRefForWorktreePath,
      saveBaseRefForBranchConfig,
      saveBaseRefForWorktreePath,
    },
    worktreeSessionFileDependencies: {
      findFirstSessionFileByPath,
      findLatestSessionFileByPath,
      saveCodexThreadIdForWorktreePath,
      openPathInConfiguredIde,
      loadLatestSessionMessages,
      loadSessionMessages,
    },
    openWorktreeInPreferredAppDependencies: {
      openPathInConfiguredIde,
      openPathInCodexApp,
      openCodexThreadInApp,
      saveOpenAppMetaForWorktreePath,
    },
    worktreeMenuBarLifecycleDependencies: createDefaultWorktreeMenuBarLifecycleDependencies(),
    worktreeMenuBarSummaryStore: createDefaultWorktreeMenuBarSummaryStore(),
    worktreeMergePreviewDependencies: {
      loadDefaultBaseRef,
      loadAheadBehindCounts,
    },
    createWorktreeFormDependencies: {
      listLocalBranches,
      loadDefaultBaseRef,
      saveBaseRefForBranchConfig,
      saveBaseRefForWorktreePath,
      saveOpenAppForWorktreePath,
    },
    loadWorktreeDeckInitialSnapshotDependencies: {
      listWorktrees(context, options) {
        return listWorktreesUsecase.list({
          context,
          dependencies: listWorktreesDependencies,
          options: { preferCache: options?.preferCache },
        });
      },
      restoreDisplayCache(args) {
        return applyWorktreeDeckDisplayCache({
          worktrees: args.worktrees,
          mappings: args.mappings,
          cache: args.displayCache,
        });
      },
      loadOpenAppMetaByWorktreePath,
    },
    loadWorktreeDeckTitlesSnapshotDependencies: {
      loadTitlesForPaths,
      attachWorktreeTitles,
    },
    loadWorktreeDeckDetailsSnapshotDependencies: {
      loadLastCommitAtByPath,
      loadCurrentBranchByPath,
      loadBaseRefByWorktreePath,
      loadOpenAppMetaByWorktreePath,
      loadWorktreeMetadata,
      loadAheadBehindCounts,
      resolveMergeTargetRef,
    },
    repositoryMappingStore: {
      loadRepositoryMappings,
      saveRepositoryMappings,
    },
    generalSettingsStore: {
      loadPreferredIdeApp,
      savePreferredIdeApp,
    },
    selectionStore: {
      loadPersistedSelection: loadPersistedSelectionFromStorage,
      savePersistedSelection: savePersistedSelectionToStorage,
    },
  };
}

/**
 * 依存解決済みの Composition Root を返す
 */
export function resolveWorktreeDeckCompositionRoot(): WorktreeDeckCompositionRoot {
  return WORKTREE_DECK_COMPOSITION_ROOT;
}

/**
 * 依存解決を共有する singleton
 */
const WORKTREE_DECK_COMPOSITION_ROOT = createWorktreeDeckCompositionRoot();
