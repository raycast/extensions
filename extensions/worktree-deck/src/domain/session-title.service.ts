/**
 * 明示設定された Codex セッションタイトル
 */
export type ExplicitSessionTitle = {
  threadId: string;
  worktreePath: string;
  title: string;
  source: "auto-start";
  createdAt: string;
  updatedAt: string;
};

/**
 * 明示セッションタイトルの保存形式
 */
export type ExplicitSessionTitleStorage = Record<string, ExplicitSessionTitle>;

const SESSION_TITLE_MAX_LENGTH_CHARS = 80;

/**
 * thread id を保存用に正規化する
 */
function normalizeThreadId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * worktree path を保存用に正規化する
 */
function normalizeWorktreePath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * セッションタイトルを1行の表示文字列へ正規化する
 */
function normalizeTitle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const firstLine = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (firstLine === undefined) {
    return null;
  }
  const title = Array.from(firstLine)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .trim();
  if (title.length === 0) {
    return null;
  }
  const trimmed = title.slice(0, SESSION_TITLE_MAX_LENGTH_CHARS).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * ISO timestamp 文字列として扱える値へ正規化する
 */
function normalizeTimestamp(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * 保存値を明示セッションタイトルの辞書へ正規化する
 */
function normalizeStorage(value: unknown): ExplicitSessionTitleStorage {
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
  if (typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: ExplicitSessionTitleStorage = {};
  const fallbackTimestamp = new Date(0).toISOString();
  for (const [rawThreadId, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    if (rawEntry === null || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
      continue;
    }
    const entry = rawEntry as Record<string, unknown>;
    const threadId = normalizeThreadId(entry.threadId) ?? normalizeThreadId(rawThreadId);
    const worktreePath = normalizeWorktreePath(entry.worktreePath);
    const title = normalizeTitle(entry.title);
    if (threadId === null || worktreePath === null || title === null) {
      continue;
    }
    const createdAt = normalizeTimestamp(entry.createdAt, fallbackTimestamp);
    result[threadId] = {
      threadId,
      worktreePath,
      title,
      source: "auto-start",
      createdAt,
      updatedAt: normalizeTimestamp(entry.updatedAt, createdAt),
    };
  }
  return result;
}

/**
 * 明示タイトルの保存エントリを組み立てる
 */
function buildEntry(args: {
  threadId: string;
  worktreePath: string;
  title: string;
  now: string;
  existing: ExplicitSessionTitle | null;
}): ExplicitSessionTitle | null {
  const threadId = normalizeThreadId(args.threadId);
  const worktreePath = normalizeWorktreePath(args.worktreePath);
  const title = normalizeTitle(args.title);
  if (threadId === null || worktreePath === null || title === null) {
    return null;
  }
  return {
    threadId,
    worktreePath,
    title,
    source: "auto-start",
    createdAt: args.existing?.createdAt ?? args.now,
    updatedAt: args.now,
  };
}

/**
 * 明示セッションタイトルのドメインサービス関数群
 */
export const sessionTitleService = {
  buildEntry,
  normalizeStorage,
  normalizeThreadId,
  normalizeTitle,
  normalizeWorktreePath,
} as const;
