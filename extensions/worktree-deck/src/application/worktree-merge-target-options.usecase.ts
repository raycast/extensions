/**
 * ブランチ選択で利用する ref 一覧と初期選択値
 */
type WorktreeBranchSelection = {
  refs: string[];
  selectedRef: string;
  storedBaseRef: string | null;
};

/**
 * merge / PR の base ref 選択に使う依存ポート
 */
export type WorktreeMergeTargetOptionsDependencies = {
  listMergeTargetRefs(worktreePath: string): Promise<string[]>;
  resolveMergeTargetRef(worktreePath: string): Promise<string | null>;
  loadBaseRefForBranchConfig(args: { worktreePath: string; branch: string }): Promise<string | null>;
  loadBaseRefForWorktreePath(worktreePath: string): Promise<string | null>;
  saveBaseRefForBranchConfig(args: { worktreePath: string; branch: string; baseRef: string }): Promise<void>;
  saveBaseRefForWorktreePath(worktreePath: string, baseRef: string): Promise<void>;
};

/**
 * 保存済み base ref を branch config 優先で読み込む
 */
async function loadStoredBaseRef(args: {
  worktreePath: string;
  branch?: string | null;
  dependencies: Pick<
    WorktreeMergeTargetOptionsDependencies,
    "loadBaseRefForBranchConfig" | "loadBaseRefForWorktreePath"
  >;
}): Promise<string | null> {
  const worktreePath = args.worktreePath.trim();
  if (!worktreePath) {
    return null;
  }
  const branch = args.branch?.trim() ?? "";
  const branchBaseRef =
    branch.length > 0 ? await args.dependencies.loadBaseRefForBranchConfig({ worktreePath, branch }) : null;
  return branchBaseRef !== null && branchBaseRef.length > 0
    ? branchBaseRef
    : await args.dependencies.loadBaseRefForWorktreePath(worktreePath);
}

/**
 * worktree merge フォームの target ref 候補を読み込む
 */
async function loadMergeTargetSelection(args: {
  worktreePath: string;
  branch?: string | null;
  dependencies: WorktreeMergeTargetOptionsDependencies;
}): Promise<WorktreeBranchSelection> {
  const worktreePath = args.worktreePath.trim();
  const storedBaseRef = await loadStoredBaseRef({
    worktreePath,
    branch: args.branch,
    dependencies: args.dependencies,
  });
  const [targetRefs, defaultTargetRef] = await Promise.all([
    args.dependencies.listMergeTargetRefs(worktreePath),
    args.dependencies.resolveMergeTargetRef(worktreePath),
  ]);
  if (
    targetRefs.length === 0 &&
    (defaultTargetRef === null || defaultTargetRef.length === 0) &&
    (storedBaseRef === null || storedBaseRef.length === 0)
  ) {
    throw new Error("No merge targets found.");
  }
  const uniqueRefs = new Set<string>(targetRefs);
  if (defaultTargetRef !== null && defaultTargetRef.length > 0) {
    uniqueRefs.add(defaultTargetRef);
  }
  if (storedBaseRef !== null && storedBaseRef.length > 0) {
    uniqueRefs.add(storedBaseRef);
  }
  const refs = Array.from(uniqueRefs).sort((left, right) => left.localeCompare(right));
  const selectedRef =
    storedBaseRef !== null && storedBaseRef.length > 0 && uniqueRefs.has(storedBaseRef)
      ? storedBaseRef
      : (defaultTargetRef ?? refs[0] ?? "");
  return { refs, selectedRef, storedBaseRef };
}

/**
 * PR 作成フォームの base ref 候補を読み込む
 */
async function loadPullRequestBaseSelection(args: {
  worktreePath: string;
  sourceBranch: string;
  dependencies: WorktreeMergeTargetOptionsDependencies;
}): Promise<WorktreeBranchSelection> {
  const worktreePath = args.worktreePath.trim();
  const sourceBranch = args.sourceBranch.trim();
  const [baseRefs, defaultBaseRef, configBaseRef, storedBaseRef] = await Promise.all([
    args.dependencies.listMergeTargetRefs(worktreePath),
    args.dependencies.resolveMergeTargetRef(worktreePath),
    args.dependencies.loadBaseRefForBranchConfig({ worktreePath, branch: sourceBranch }),
    args.dependencies.loadBaseRefForWorktreePath(worktreePath),
  ]);
  if (baseRefs.length === 0 && (defaultBaseRef === null || defaultBaseRef.length === 0)) {
    throw new Error("No base branches found.");
  }
  const uniqueRefs = new Set<string>(baseRefs);
  if (defaultBaseRef !== null && defaultBaseRef.length > 0) {
    uniqueRefs.add(defaultBaseRef);
  }
  const refs = Array.from(uniqueRefs).sort((left, right) => left.localeCompare(right));
  const resolvedStoredBaseRef = configBaseRef ?? storedBaseRef;
  const selectedRef =
    resolvedStoredBaseRef !== null && resolvedStoredBaseRef.length > 0 && uniqueRefs.has(resolvedStoredBaseRef)
      ? resolvedStoredBaseRef
      : (defaultBaseRef ?? refs[0] ?? "");
  return { refs, selectedRef, storedBaseRef: resolvedStoredBaseRef };
}

/**
 * 選択した base ref を保存する
 */
async function saveBaseSelection(args: {
  worktreePath: string;
  branch?: string | null;
  baseRef: string;
  dependencies: WorktreeMergeTargetOptionsDependencies;
}): Promise<void> {
  const worktreePath = args.worktreePath.trim();
  const baseRef = args.baseRef.trim();
  if (!worktreePath || !baseRef) {
    return;
  }
  const branch = args.branch?.trim() ?? "";
  if (branch) {
    await args.dependencies.saveBaseRefForBranchConfig({ worktreePath, branch, baseRef });
  }
  await args.dependencies.saveBaseRefForWorktreePath(worktreePath, baseRef);
}

/**
 * merge target / PR base 選択ユースケース関数群
 */
export const worktreeMergeTargetOptionsUsecase = {
  loadMergeTargetSelection,
  loadPullRequestBaseSelection,
  loadStoredBaseRef,
  saveBaseSelection,
} as const;
