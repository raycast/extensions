/**
 * Codex reasoning effort の選択値
 */
export type CodexReasoningEffort = "low" | "medium" | "high" | "xhigh";

/**
 * Codex approval policy の選択値
 */
export type CodexApprovalPolicy = "on-failure" | "on-request" | "never";

/**
 * Codex sandbox mode の選択値
 */
export type CodexSandboxMode = "read-only" | "workspace-write" | "danger-full-access";

/**
 * Codex approval reviewer の選択値
 */
export type CodexApprovalsReviewer = "user" | "auto_review" | "guardian_subagent";

/**
 * Codex web search mode の選択値
 */
export type CodexWebSearchMode = "disabled" | "cached" | "live";

/**
 * Codex service tier の選択値
 */
export type CodexServiceTier = "default" | "fast";

/**
 * Codex 権限プリセットの選択値
 */
export type CodexPermissionMode = "default" | "auto_review" | "full_access" | "custom";

/**
 * Codex 権限プリセットが展開するメタ情報
 */
export type CodexPermissionMetadata = Pick<
  CodexInitialSessionMetadata,
  "approvalPolicy" | "sandboxMode" | "approvalsReviewer" | "webSearch"
>;

/**
 * 初回 Codex セッションに適用するメタ情報
 */
export type CodexInitialSessionMetadata = {
  model: string;
  serviceTier: CodexServiceTier;
  reasoningEffort: CodexReasoningEffort;
  approvalPolicy: CodexApprovalPolicy;
  sandboxMode: CodexSandboxMode;
  approvalsReviewer: CodexApprovalsReviewer;
  webSearch: CodexWebSearchMode;
};

/**
 * Codex 初回セッションの既定メタ情報を読む入力値
 */
export type LoadCodexInitialSessionDefaultsQuery = {
  repoRoot: string;
};

/**
 * Codex 初回セッションを開始する入力値
 */
export type StartCodexInitialSessionCommand = {
  worktreePath: string;
  initialPrompt: string;
  metadata: CodexInitialSessionMetadata;
};

/**
 * Codex 初回セッション開始結果
 */
export type StartCodexInitialSessionResult = {
  threadId: string;
};

/**
 * Codex 初回セッション開始ユースケースの依存ポート
 */
export type StartCodexInitialSessionDependencies = {
  loadDefaults(query: LoadCodexInitialSessionDefaultsQuery): Promise<CodexInitialSessionMetadata>;
  start(command: StartCodexInitialSessionCommand): Promise<StartCodexInitialSessionResult>;
};

/**
 * Codex 初回セッションの既定メタ情報を読む
 */
async function loadDefaults(args: {
  query: LoadCodexInitialSessionDefaultsQuery;
  dependencies: Pick<StartCodexInitialSessionDependencies, "loadDefaults">;
}): Promise<CodexInitialSessionMetadata> {
  const repoRoot = args.query.repoRoot.trim();
  if (!repoRoot) {
    throw new Error("Repository is required.");
  }
  return args.dependencies.loadDefaults({ repoRoot });
}

/**
 * Codex 初回セッションを開始する
 */
async function start(args: {
  command: StartCodexInitialSessionCommand;
  dependencies: Pick<StartCodexInitialSessionDependencies, "start">;
}): Promise<StartCodexInitialSessionResult> {
  const worktreePath = args.command.worktreePath.trim();
  if (!worktreePath) {
    throw new Error("Worktree path is required.");
  }
  const initialPrompt = args.command.initialPrompt.trim();
  if (!initialPrompt) {
    throw new Error("Initial prompt is required.");
  }
  const metadata = normalizeMetadata(args.command.metadata);
  return args.dependencies.start({
    worktreePath,
    initialPrompt,
    metadata,
  });
}

/**
 * UI 由来のメタ情報をセッション開始に使う値へ正規化する
 */
function normalizeMetadata(metadata: CodexInitialSessionMetadata): CodexInitialSessionMetadata {
  return {
    model: metadata.model.trim(),
    serviceTier: normalizeServiceTier(metadata.serviceTier),
    reasoningEffort: normalizeReasoningEffort(metadata.reasoningEffort),
    approvalPolicy: normalizeApprovalPolicy(metadata.approvalPolicy),
    sandboxMode: normalizeSandboxMode(metadata.sandboxMode),
    approvalsReviewer: normalizeApprovalsReviewer(metadata.approvalsReviewer),
    webSearch: normalizeWebSearchMode(metadata.webSearch),
  };
}

/**
 * 権限プリセットを App Server 向けの詳細値へ展開する
 */
export function resolveCodexPermissionMetadata(args: {
  permissionMode: CodexPermissionMode | string;
  customMetadata?: CodexPermissionMetadata | null;
}): CodexPermissionMetadata {
  if (args.permissionMode === "auto_review") {
    return {
      approvalPolicy: "on-request",
      sandboxMode: "workspace-write",
      approvalsReviewer: "guardian_subagent",
      webSearch: "cached",
    };
  }
  if (args.permissionMode === "full_access") {
    return {
      approvalPolicy: "never",
      sandboxMode: "danger-full-access",
      approvalsReviewer: "user",
      webSearch: "live",
    };
  }
  if (args.permissionMode === "custom" && args.customMetadata) {
    return {
      approvalPolicy: normalizeApprovalPolicy(args.customMetadata.approvalPolicy),
      sandboxMode: normalizeSandboxMode(args.customMetadata.sandboxMode),
      approvalsReviewer: normalizeApprovalsReviewer(args.customMetadata.approvalsReviewer),
      webSearch: normalizeWebSearchMode(args.customMetadata.webSearch),
    };
  }
  return {
    approvalPolicy: "on-request",
    sandboxMode: "workspace-write",
    approvalsReviewer: "user",
    webSearch: "cached",
  };
}

/**
 * 詳細メタ情報に対応する権限プリセットを推定する
 */
export function resolveCodexPermissionMode(metadata: CodexPermissionMetadata): CodexPermissionMode {
  const normalized = {
    approvalPolicy: normalizeApprovalPolicy(metadata.approvalPolicy),
    sandboxMode: normalizeSandboxMode(metadata.sandboxMode),
    approvalsReviewer: normalizeApprovalsReviewer(metadata.approvalsReviewer),
    webSearch: normalizeWebSearchMode(metadata.webSearch),
  };
  if (
    normalized.approvalPolicy === "on-request" &&
    normalized.sandboxMode === "workspace-write" &&
    (normalized.approvalsReviewer === "auto_review" || normalized.approvalsReviewer === "guardian_subagent") &&
    normalized.webSearch === "cached"
  ) {
    return "auto_review";
  }
  if (
    normalized.approvalPolicy === "never" &&
    normalized.sandboxMode === "danger-full-access" &&
    normalized.approvalsReviewer === "user" &&
    normalized.webSearch === "live"
  ) {
    return "full_access";
  }
  if (
    normalized.approvalPolicy === "on-request" &&
    normalized.sandboxMode === "workspace-write" &&
    normalized.approvalsReviewer === "user" &&
    normalized.webSearch === "cached"
  ) {
    return "default";
  }
  return "custom";
}

/**
 * service tier を有効値へ正規化する
 */
function normalizeServiceTier(value: string): CodexServiceTier {
  return value === "fast" ? "fast" : "default";
}

/**
 * reasoning effort を有効値へ正規化する
 */
function normalizeReasoningEffort(value: string): CodexReasoningEffort {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return value === "xhigh" ? "xhigh" : "medium";
}

/**
 * approval policy を有効値へ正規化する
 */
function normalizeApprovalPolicy(value: string): CodexApprovalPolicy {
  if (value === "on-failure" || value === "never") {
    return value;
  }
  return "on-request";
}

/**
 * sandbox mode を有効値へ正規化する
 */
function normalizeSandboxMode(value: string): CodexSandboxMode {
  if (value === "read-only" || value === "danger-full-access") {
    return value;
  }
  return "workspace-write";
}

/**
 * approval reviewer を有効値へ正規化する
 */
function normalizeApprovalsReviewer(value: string): CodexApprovalsReviewer {
  if (value === "auto_review" || value === "guardian_subagent") {
    return value;
  }
  return "user";
}

/**
 * web search mode を有効値へ正規化する
 */
function normalizeWebSearchMode(value: string): CodexWebSearchMode {
  if (value === "live" || value === "disabled") {
    return value;
  }
  return "cached";
}

/**
 * Codex 初回セッション開始ユースケース関数群
 */
export const startCodexInitialSessionUsecase = {
  loadDefaults,
  start,
} as const;
