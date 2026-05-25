import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/**
 * Raycast Store スクリーンショット用の安全なデモルート
 */
const DEMO_ROOT = join(process.cwd(), "store-screenshot-demo");

/**
 * 撮影用 HOME として使うディレクトリ
 */
const DEMO_HOME = join(DEMO_ROOT, "home");

/**
 * Worktree Deck が読む worktree ベースディレクトリ
 */
const WORKTREE_BASE = join(DEMO_ROOT, "worktrees");

/**
 * Worktree Deck が読む Codex Home
 */
const CODEX_HOME = join(DEMO_ROOT, "codex-home");

/**
 * Worktree Deck のファイルストレージ
 */
const STORAGE_DIR = join(DEMO_HOME, ".worktree-deck", "storage");

/**
 * 撮影に使うサンプルリポジトリ定義
 */
const REPOSITORIES = [
  {
    name: "sample-app",
    worktrees: [
      {
        dir: "main",
        branch: "main",
        title: "Ship the dashboard refresh",
        latest: "🤖 Dashboard cards are aligned and the smoke checks are passing.",
        status: "done",
        openApp: "codex-app",
      },
      {
        dir: "feature-login",
        branch: "feature/login-screen",
        title: "Polish the login screen empty state",
        latest: "🤖 Updated copy, spacing, and focused tests for the empty state.",
        status: "working",
        openApp: "zed",
      },
      {
        dir: "review-copy",
        branch: "review/copy-refresh",
        title: "Review onboarding copy changes",
        latest: "🙂 Please confirm whether the shorter onboarding message is preferred.",
        status: "waiting",
        openApp: "codex-app",
      },
    ],
  },
  {
    name: "docs-site",
    worktrees: [
      {
        dir: "main",
        branch: "main",
        title: "Prepare release notes page",
        latest: "🤖 Release notes now include screenshots and installation notes.",
        status: "done",
        openApp: "zed",
      },
      {
        dir: "feature-search",
        branch: "feature/search-filter",
        title: "Add search filters to docs",
        latest: "🤖 Filter chips and keyboard navigation are wired up.",
        status: "working",
        openApp: "codex-app",
      },
    ],
  },
];

/**
 * 外部コマンドを実行する
 */
function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Demo User",
      GIT_AUTHOR_EMAIL: "demo@example.invalid",
      GIT_COMMITTER_NAME: "Demo User",
      GIT_COMMITTER_EMAIL: "demo@example.invalid",
    },
  });
}

/**
 * JSONL 用に 1 行 JSON を作る
 */
function jsonLine(value) {
  return `${JSON.stringify(value)}\n`;
}

/**
 * 安全なダミー Codex セッションログを作る
 */
function buildSessionLog(entry, worktreePath, threadId, timestamp) {
  const turnId = `${threadId}-turn`;
  const lines = [
    {
      type: "session_meta",
      timestamp,
      payload: {
        id: threadId,
        cwd: worktreePath,
        source: "codex-cli",
      },
    },
    {
      type: "turn_context",
      timestamp,
      payload: {
        cwd: worktreePath,
        turn_id: turnId,
        model: "gpt-5-codex",
      },
    },
    {
      type: "event_msg",
      timestamp,
      payload: {
        type: "user_message",
        message: entry.title,
        turn_id: turnId,
      },
    },
    {
      type: "response_item",
      timestamp,
      payload: {
        type: "message",
        role: "assistant",
        phase: entry.status === "done" ? "final_answer" : "commentary",
        content: [{ type: "output_text", text: entry.latest.replace(/^🤖\s*/, "").replace(/^🙂\s*/, "") }],
      },
    },
  ];
  if (entry.status === "waiting") {
    lines.push({
      type: "response_item",
      timestamp,
      payload: {
        type: "function_call",
        name: "request_user_input",
        call_id: `${threadId}-approval`,
        arguments: "{}",
      },
    });
  }
  if (entry.status === "done") {
    lines.push({ type: "response.completed", timestamp, payload: {} });
  }
  return lines.map(jsonLine).join("");
}

/**
 * ファイルを書き込んで git commit する
 */
function commitFile(repoPath, fileName, content, message) {
  writeFileSync(join(repoPath, fileName), content);
  run("git", ["add", fileName], repoPath);
  run("git", ["commit", "-m", message], repoPath);
}

/**
 * リポジトリと worktree 群を作る
 */
function createRepository(spec) {
  const repoRoot = join(WORKTREE_BASE, spec.name);
  const mainEntry = spec.worktrees[0];
  const mainPath = join(repoRoot, mainEntry.dir);
  mkdirSync(repoRoot, { recursive: true });
  mkdirSync(mainPath, { recursive: true });
  run("git", ["init", "--initial-branch=main"], mainPath);
  commitFile(mainPath, "README.md", `# ${spec.name}\n\nStore screenshot demo repository.\n`, "Initial demo commit");

  const created = [{ ...mainEntry, path: mainPath }];
  for (const entry of spec.worktrees.slice(1)) {
    const worktreePath = join(repoRoot, entry.dir);
    run("git", ["worktree", "add", "-b", entry.branch, worktreePath], mainPath);
    commitFile(worktreePath, `${entry.dir}.md`, `# ${entry.title}\n\nDemo-only change.\n`, entry.title);
    created.push({ ...entry, path: worktreePath });
  }
  return created;
}

/**
 * Codex セッションログと Worktree Deck ストレージを作る
 */
function createAppState(entries) {
  const sessionDir = join(CODEX_HOME, "sessions", "2026", "05", "25");
  mkdirSync(sessionDir, { recursive: true });
  mkdirSync(STORAGE_DIR, { recursive: true });

  const openAppStorage = {};
  const baseBranchStorage = {};
  const repositoryMappings = [];
  entries.forEach((entry, index) => {
    const threadId = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const timestamp = new Date(Date.UTC(2026, 4, 25, 1, index, 0)).toISOString();
    writeFileSync(join(sessionDir, `${threadId}.jsonl`), buildSessionLog(entry, entry.path, threadId, timestamp));
    openAppStorage[entry.path] = { openApp: entry.openApp, threadId };
    baseBranchStorage[entry.path] = { baseRef: "main" };
    repositoryMappings.push({ repoRoot: entry.path, mapValue: basename(dirname(entry.path)) });
  });

  writeFileSync(join(STORAGE_DIR, "worktree-open-app.json"), JSON.stringify(openAppStorage));
  writeFileSync(join(STORAGE_DIR, "worktree-base-branch.json"), JSON.stringify(baseBranchStorage));
  writeFileSync(join(STORAGE_DIR, "general-settings.json"), JSON.stringify({ ideApp: "zed" }));
  writeFileSync(join(STORAGE_DIR, "repository-mappings.json"), JSON.stringify(repositoryMappings));
}

/**
 * デモ環境を作り直す
 */
function main() {
  rmSync(DEMO_ROOT, { recursive: true, force: true });
  mkdirSync(WORKTREE_BASE, { recursive: true });
  const entries = REPOSITORIES.flatMap(createRepository);
  createAppState(entries);

  console.log(`Demo root: ${DEMO_ROOT}`);
  console.log(`HOME=${DEMO_HOME}`);
  console.log(`GIT_WORKTREE_PATH=${WORKTREE_BASE}`);
  console.log(`CODEX_HOME=${CODEX_HOME}`);
}

main();
