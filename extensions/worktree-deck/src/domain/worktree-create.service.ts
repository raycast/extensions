/**
 * worktree パス要素として避ける文字列の判定条件
 */
const UNSAFE_WORKTREE_PATH_SEGMENT_CHARS = new Set(["<", ">", ":", '"', "\\", "|", "?", "*"]);

/**
 * worktree 作成先パス要素の組み立て結果
 */
type WorktreeDestinationPathSegmentsResult = { ok: true; value: string[] } | { ok: false; error: string };

/**
 * path segment に使えない文字か判定する
 */
function isUnsafeWorktreePathSegmentChar(char: string): boolean {
  return UNSAFE_WORKTREE_PATH_SEGMENT_CHARS.has(char) || char.charCodeAt(0) < 32;
}

/**
 * worktree パス要素として使う文字列を読みやすい安全な名前へ正規化する
 */
function sanitizeWorktreePathSegment(value: string): string {
  return value
    .trim()
    .split("")
    .map((char) => (isUnsafeWorktreePathSegmentChar(char) ? "-" : char))
    .join("")
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+/g, "")
    .replace(/[.-]+$/g, "");
}

/**
 * repository mapping と branch から worktree 作成先の相対パス要素を作る
 */
function buildDestinationPathSegments(args: {
  mapValue: string | null;
  branch: string;
}): WorktreeDestinationPathSegmentsResult {
  const repoSegment = sanitizeWorktreePathSegment(args.mapValue ?? "");
  if (!repoSegment) {
    return { ok: false, error: "Repository mapping is required." };
  }

  const rawBranchSegments = args.branch.split("/");
  const branchSegments = rawBranchSegments.map((segment) => sanitizeWorktreePathSegment(segment));
  if (branchSegments.length === 0 || branchSegments.some((segment) => !segment)) {
    return { ok: false, error: "Worktree branch path contains an invalid segment." };
  }

  return { ok: true, value: [repoSegment, ...branchSegments] };
}

/**
 * worktree 作成スクリプト出力から作成先パスを抽出する
 */
function parseCreatedPath(stdout: string): string | null {
  const lines = stdout.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("Created worktree:")) {
      continue;
    }
    return trimmed.replace("Created worktree:", "").trim() || null;
  }
  return null;
}

/**
 * worktree 作成ドメインサービス関数群
 */
export const worktreeCreateService = {
  buildDestinationPathSegments,
  parseCreatedPath,
  sanitizeWorktreePathSegment,
} as const;
