/**
 * worktree を開く固定アプリ
 */
export type WorktreeOpenApp = "zed" | "codex-app";

/**
 * worktree 起動アプリの保存メタ情報
 */
export type WorktreeOpenAppMeta = {
  openApp: WorktreeOpenApp;
  threadId: string | null;
};

/**
 * worktree 起動アプリの保存形式
 */
export type WorktreeOpenAppStorage = Record<string, WorktreeOpenAppMeta>;

/**
 * 起動アプリ値を正規化する
 */
function normalizeOpenApp(value: unknown): WorktreeOpenApp | null {
  if (value === "zed" || value === "codex-app") {
    return value;
  }
  return null;
}

/**
 * Codex thread id を正規化する
 */
function normalizeThreadId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed.toLowerCase() : null;
}

/**
 * 未保存時の起動アプリを解決する
 */
function resolvePreferred(value: WorktreeOpenApp | null | undefined): WorktreeOpenApp {
  return value ?? "zed";
}

/**
 * storage 保存値を正規化する
 */
function normalizeStorage(value: unknown): WorktreeOpenAppStorage {
  if (value === null || value === undefined) {
    return {};
  }
  if (typeof value === "string") {
    try {
      return normalizeStorage(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  if (typeof value !== "object") {
    return {};
  }
  const result: WorktreeOpenAppStorage = {};
  for (const [rawPath, entry] of Object.entries(value as Record<string, unknown>)) {
    const path = rawPath.trim();
    if (!path || entry === null || typeof entry !== "object") {
      continue;
    }
    const openApp = normalizeOpenApp((entry as Record<string, unknown>).openApp);
    if (!openApp) {
      continue;
    }
    const threadId = normalizeThreadId((entry as Record<string, unknown>).threadId);
    result[path] = { openApp, threadId };
  }
  return result;
}

/**
 * セッションファイルパスから Codex thread id を抽出する
 */
function extractThreadIdFromSessionPath(path: string): string | null {
  const match = path.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
  const matchedThreadId = match?.[1] ?? null;
  return normalizeThreadId(matchedThreadId);
}

/**
 * Codex App の thread deeplink を組み立てる
 */
function buildCodexThreadUrl(threadId: string): string | null {
  const normalized = normalizeThreadId(threadId);
  if (normalized === null) {
    return null;
  }
  return `codex://threads/${normalized}`;
}

/**
 * 詳細表示向けの起動アプリラベルを返す
 */
function formatMetaLabel(openApp: WorktreeOpenApp): string {
  if (openApp === "codex-app") {
    return "CA";
  }
  return "Zed";
}

/**
 * worktree 起動アプリのドメインサービス関数群
 */
export const worktreeOpenAppService = {
  buildCodexThreadUrl,
  extractThreadIdFromSessionPath,
  formatMetaLabel,
  normalizeOpenApp,
  normalizeStorage,
  normalizeThreadId,
  resolvePreferred,
} as const;
