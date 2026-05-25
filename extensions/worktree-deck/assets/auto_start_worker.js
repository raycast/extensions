#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const { mkdtemp, mkdir, readFile, rm, writeFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { get } = require("node:http");
const { homedir, tmpdir } = require("node:os");
const { delimiter, dirname, join, normalize } = require("node:path");

const AUTO_START_METADATA_GENERATION_PROMPT_HEADER = [
  "Generate concise metadata for this task.",
  'Output only JSON with string fields "branch" and "sessionTitle".',
  "branch must be a valid Git branch name.",
  "sessionTitle must be a concise human-readable title.",
].join(" ");
const BRANCH_NAME_CODEX_MODEL = "gpt-5.3-codex-spark";
const BRANCH_NAME_REASONING_EFFORT = "xhigh";
const CODEX_EXEC_TIMEOUT_MS = 60_000;
const APP_SERVER_READY_TIMEOUT_MS = 8_000;
const JSON_RPC_TIMEOUT_MS = 15_000;
const DEFAULT_CODEX_APP_SERVER_PORT = 53621;
const DEFAULT_COMMAND_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];
const INVALID_BRANCH_NAME_PATTERN = /[\s~^:?*[\]\\]/;
const UNSAFE_WORKTREE_PATH_SEGMENT_PATTERN = /[<>:"\\|?*\u0000-\u001f]+/g;
const SESSION_TITLE_MAX_LENGTH_CHARS = 80;

/**
 * job の現在状態を読み込む
 */
async function readJobState(payload) {
  try {
    return JSON.parse(await readFile(payload.statePath, "utf8"));
  } catch {
    return {
      id: payload.id,
      repoRoot: payload.repoRoot,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * state path から job の現在状態を読み込む
 */
async function readJobStateByPath(statePath) {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return {
      statePath,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * job の状態を書き込む
 */
async function writeJobState(payload, patch) {
  const current = await readJobState(payload);
  await writeFile(payload.statePath, JSON.stringify({ ...current, ...patch }, null, 2), "utf8");
}

/**
 * payload 復元前の失敗を state path へ書き込む
 */
async function writeJobStateByPath(statePath, patch) {
  const current = await readJobStateByPath(statePath);
  await writeFile(statePath, JSON.stringify({ ...current, ...patch }, null, 2), "utf8");
}

/**
 * unknown からエラーメッセージを取り出す
 */
function extractErrorMessage(error) {
  return error instanceof Error ? error.message : "Unknown error";
}

/**
 * 非致命エラーを warning として記録する
 */
async function runWarningStep(warnings, label, task) {
  try {
    return await task();
  } catch (error) {
    warnings.push(`${label}: ${extractErrorMessage(error)}`);
    return null;
  }
}

/**
 * PATH に代表的な探索ディレクトリを追加する
 */
function buildCommandPath(currentPath) {
  const segments = new Set((currentPath ?? "").split(delimiter).filter((segment) => segment.trim().length > 0));
  for (const path of DEFAULT_COMMAND_PATHS) {
    segments.add(path);
  }
  return Array.from(segments).join(delimiter);
}

/**
 * child process の stderr を英語エラーとして返す
 */
function buildProcessError(command, args, code, stderr) {
  const message = stderr.trim() || `${command} failed with exit code ${code ?? "unknown"}.`;
  return new Error(`${message}\nCommand: ${command} ${args.join(" ")}`);
}

/**
 * 外部コマンド未導入時の英語案内文を返す
 */
function formatMissingCommandMessage(command) {
  if (command === "git") {
    return "Git is required to manage worktrees. Install Git and ensure it is available in PATH.";
  }
  if (command === "codex") {
    return "Codex CLI is required for Codex actions. Install Codex and ensure it is available in PATH.";
  }
  return `${command} command was not found in PATH.`;
}

/**
 * spawn ENOENT を明確な案内エラーへ変換する
 */
function normalizeMissingCommandError(error, command) {
  if (error && error.code === "ENOENT") {
    return new Error(formatMissingCommandMessage(command));
  }
  return error;
}

/**
 * child process を実行して stdout/stderr を返す
 */
async function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: options.input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let settled = false;
    const timeout =
      options.timeoutMs === undefined
        ? null
        : setTimeout(() => {
            if (settled) {
              return;
            }
            settled = true;
            child.kill("SIGTERM");
            reject(new Error(`${command} timed out.`));
          }, options.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      reject(normalizeMissingCommandError(error, command));
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(buildProcessError(command, args, code, stderr));
    });
    if (options.input !== undefined) {
      child.stdin.end(options.input);
    }
  });
}

/**
 * git コマンドを対象リポジトリで実行する
 */
async function execGit(repoRoot, gitArgs) {
  return runProcess("git", ["-C", repoRoot, ...gitArgs], { cwd: repoRoot });
}

/**
 * AppleScript 文字列リテラルへ変換する
 */
function toAppleScriptString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * detached worker から macOS 通知を出す
 */
function notify(title, message) {
  const script = `display notification ${toAppleScriptString(message)} with title ${toAppleScriptString(title)}`;
  const child = spawn("osascript", ["-e", script], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

/**
 * process env から指定キーの値を読み込む
 */
function readEnvValue(key) {
  const fromProcess = process.env[key]?.trim();
  return fromProcess || null;
}

/**
 * チルダを home path へ展開する
 */
function expandHomePath(value) {
  if (value === "~") {
    return process.env.HOME?.trim() || homedir();
  }
  if (value.startsWith("~/")) {
    return join(process.env.HOME?.trim() || homedir(), value.slice(2));
  }
  return value;
}

/**
 * worktree-deck の storage ディレクトリを解決する
 */
function resolveStorageDir() {
  return join(process.env.HOME?.trim() || homedir(), ".worktree-deck", "storage");
}

/**
 * storage JSON を読み込む
 */
async function readStorageJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return {};
  }
}

/**
 * storage JSON を書き込む
 */
async function writeStorageJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

/**
 * worktree パスごとの baseRef を保存する
 */
async function saveWorktreeBaseRef(payload, worktreePath, baseRef) {
  const storagePath = join(resolveStorageDir(), "worktree-base-branch.json");
  const storage = await readStorageJson(storagePath);
  await writeStorageJson(storagePath, {
    ...storage,
    [worktreePath]: { baseRef },
  });
}

/**
 * worktree パスごとの起動アプリを保存する
 */
async function saveOpenApp(payload, worktreePath, openApp, threadId = null) {
  const normalizedOpenApp = openApp === "codex-app" ? "codex-app" : "zed";
  const storagePath = join(resolveStorageDir(), "worktree-open-app.json");
  const storage = await readStorageJson(storagePath);
  const storedThreadId = storage[worktreePath]?.threadId ?? null;
  await writeStorageJson(storagePath, {
    ...storage,
    [worktreePath]: { openApp: normalizedOpenApp, threadId: threadId ?? storedThreadId },
  });
}

/**
 * 明示セッションタイトルを保存する
 */
async function saveSessionTitle(payload, worktreePath, threadId, title) {
  const normalizedThreadId = normalizeThreadId(threadId);
  const normalizedTitle = normalizeSessionTitle(title);
  if (!normalizedThreadId || !worktreePath || !normalizedTitle) {
    return;
  }
  const storagePath = join(resolveStorageDir(), "worktree-session-titles.json");
  const storage = await readStorageJson(storagePath);
  const now = new Date().toISOString();
  const existing = storage[normalizedThreadId];
  await writeStorageJson(storagePath, {
    ...storage,
    [normalizedThreadId]: {
      threadId: normalizedThreadId,
      worktreePath,
      title: normalizedTitle,
      source: "auto-start",
      createdAt: typeof existing?.createdAt === "string" && existing.createdAt.trim() ? existing.createdAt : now,
      updatedAt: now,
    },
  });
}

/**
 * Codex App/CLI 側の thread 表示名を設定する
 */
async function setCodexThreadName(client, threadId, title) {
  const normalizedThreadId = normalizeThreadId(threadId);
  const normalizedTitle = normalizeSessionTitle(title);
  if (!normalizedThreadId || !normalizedTitle) {
    return;
  }
  await client.request("thread/name/set", {
    threadId: normalizedThreadId,
    name: normalizedTitle,
  });
}

/**
 * git config 用に branch 名をエスケープする
 */
function buildBaseRefConfigKey(branch) {
  const escaped = branch.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `branch."${escaped}".worktreeDeckBaseRef`;
}

/**
 * branch config に baseRef を保存する
 */
async function saveBranchBaseRef(worktreePath, branch, baseRef) {
  await execGit(worktreePath, ["config", buildBaseRefConfigKey(branch), baseRef]);
}

/**
 * Auto Start メタ情報生成用プロンプトを作る
 */
function buildGenerationPrompt(initialPrompt) {
  const trimmed = initialPrompt.trim();
  if (!trimmed) {
    throw new Error("Initial prompt is required.");
  }
  return `${AUTO_START_METADATA_GENERATION_PROMPT_HEADER}\n\nTask:\n${trimmed}`;
}

/**
 * 制御文字を含むか判定する
 */
function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

/**
 * branch 名候補を検証する
 */
function validateBranchName(branch) {
  if (
    !branch ||
    branch === "@" ||
    branch.startsWith("/") ||
    branch.startsWith("-") ||
    branch.endsWith("/") ||
    branch.endsWith(".") ||
    branch.includes("..") ||
    branch.includes("//") ||
    branch.includes("@{") ||
    branch.split("/").some((segment) => !segment || segment.startsWith(".") || segment.endsWith(".lock")) ||
    INVALID_BRANCH_NAME_PATTERN.test(branch) ||
    hasControlCharacter(branch)
  ) {
    throw new Error("Generated branch name is invalid.");
  }
  return branch;
}

/**
 * Codex 出力から branch 名候補を抽出する
 */
function normalizeGeneratedBranchName(value) {
  const withoutFence = value
    .trim()
    .replace(/^```(?:[a-zA-Z0-9_-]+)?\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
  const firstLine = withoutFence
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const candidate = (firstLine ?? "")
    .replace(/^git\s+checkout\s+-b\s+/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
  return validateBranchName(candidate);
}

/**
 * Codex thread id を正規化する
 */
function normalizeThreadId(value) {
  return typeof value === "string" ? value.trim() || null : null;
}

/**
 * セッションタイトルを表示用の1行文字列へ正規化する
 */
function normalizeSessionTitle(value) {
  if (typeof value !== "string") {
    return null;
  }
  const firstLine = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) {
    return null;
  }
  const title = Array.from(firstLine)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .trim();
  return title ? title.slice(0, SESSION_TITLE_MAX_LENGTH_CHARS).trim() || null : null;
}

/**
 * Codex 出力の JSON 部分を取り出す
 */
function extractJsonObjectText(value) {
  const withoutFence = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Generated metadata is not JSON.");
  }
  return withoutFence.slice(start, end + 1);
}

/**
 * Codex 出力から Auto Start メタ情報を抽出する
 */
function normalizeGeneratedAutoStartMetadata(value) {
  const parsed = JSON.parse(extractJsonObjectText(value));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Generated metadata is invalid.");
  }
  const branch = normalizeGeneratedBranchName(String(parsed.branch ?? ""));
  const sessionTitle = normalizeSessionTitle(parsed.sessionTitle);
  if (!sessionTitle) {
    throw new Error("Generated session title is invalid.");
  }
  return { branch, sessionTitle };
}

/**
 * fallback branch の元になる slug を作る
 */
function buildPromptSlug(initialPrompt) {
  return (
    initialPrompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/g, "") || "auto-start"
  );
}

/**
 * branch 名生成失敗時の fallback branch を作る
 */
function buildFallbackBranchName(initialPrompt) {
  return `auto-start/${buildPromptSlug(initialPrompt)}-${Date.now().toString(36)}`;
}

/**
 * title 生成失敗時の fallback title を作る
 */
function buildFallbackSessionTitle(initialPrompt) {
  return normalizeSessionTitle(initialPrompt) || "Auto Start Session";
}

/**
 * Auto Start 完了通知に表示する branch と title を組み立てる
 */
function formatCompletionNotificationMessage(branch, sessionTitle, branchGenerationWarning) {
  const branchLine = branchGenerationWarning ? `Fallback branch: ${branch}` : `Branch: ${branch}`;
  return `${branchLine}\nTitle: ${sessionTitle}`;
}

/**
 * 既存 branch と衝突しない branch 名を選ぶ
 */
function resolveAvailableBranchName(preferredBranch, existingBranches) {
  const existing = new Set(existingBranches);
  if (!existing.has(preferredBranch)) {
    return preferredBranch;
  }
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${preferredBranch}-${index}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }
  throw new Error("Available branch name could not be resolved.");
}

/**
 * Codex exec で Auto Start メタ情報を生成する
 */
async function generateAutoStartMetadata(payload) {
  const tempDir = await mkdtemp(join(tmpdir(), "worktree-deck-branch-"));
  const outputPath = join(tempDir, "metadata.json");
  const args = [
    "exec",
    "--sandbox",
    "read-only",
    "--ephemeral",
    "-m",
    BRANCH_NAME_CODEX_MODEL,
    "-c",
    'approval_policy="never"',
    "-c",
    `model_reasoning_effort="${BRANCH_NAME_REASONING_EFFORT}"`,
    "-C",
    payload.repoRoot,
    "--output-last-message",
    outputPath,
    "-",
  ];
  try {
    const result = await runProcess("codex", args, {
      cwd: payload.repoRoot,
      env: { ...process.env, PATH: buildCommandPath(process.env.PATH) },
      input: buildGenerationPrompt(payload.initialPrompt),
      timeoutMs: CODEX_EXEC_TIMEOUT_MS,
    });
    let output = result.stdout;
    try {
      const fileOutput = (await readFile(outputPath, "utf8")).trim();
      if (fileOutput) {
        output = fileOutput;
      }
    } catch {
      // Codex が最終メッセージファイルを書けない場合は stdout を使う
    }
    return normalizeGeneratedAutoStartMetadata(output);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * ローカル branch 一覧を取得する
 */
async function listLocalBranches(repoRoot) {
  const { stdout } = await execGit(repoRoot, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
  return stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * worktree パス要素を安全な名前へ変換する
 */
function sanitizeWorktreePathSegment(value) {
  return value
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(UNSAFE_WORKTREE_PATH_SEGMENT_PATTERN, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+/g, "")
    .replace(/[.-]+$/g, "");
}

/**
 * worktree 作成先パスを組み立てる
 */
async function resolveWorktreeDestination(payload, branch) {
  const basePath = readEnvValue("GIT_WORKTREE_PATH");
  if (!basePath) {
    throw new Error("GIT_WORKTREE_PATH is not set.");
  }
  const repoSegment = sanitizeWorktreePathSegment(payload.mapValue);
  const branchSegments = branch.split("/").map((segment) => sanitizeWorktreePathSegment(segment));
  if (!repoSegment || branchSegments.some((segment) => !segment)) {
    throw new Error("Worktree branch path contains an invalid segment.");
  }
  return join(normalize(expandHomePath(basePath)), repoSegment, ...branchSegments);
}

/**
 * ローカル branch が存在するか判定する
 */
async function localBranchExists(repoRoot, branch) {
  try {
    await execGit(repoRoot, ["show-ref", "--verify", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * 未追跡ファイルコピー worker を開始する
 */
async function startCopyWorker(payload, destination) {
  const id = `${payload.id}-copy`;
  const statePath = join(resolveStorageDir(), "copy-jobs", `${id}.json`);
  const copyPayload = {
    id,
    repoRoot: payload.repoRoot,
    destination,
    statePath,
  };
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(
    statePath,
    JSON.stringify({ ...copyPayload, status: "pending", createdAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
  const child = spawn(
    process.execPath,
    [join(dirname(payload.scriptPath), "copy_untracked_worker.js"), JSON.stringify(copyPayload)],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();
}

/**
 * worktree を作成する
 */
async function createWorktree(payload, branch, warnings) {
  const destination = await resolveWorktreeDestination(payload, branch);
  if (existsSync(destination)) {
    throw new Error("Worktree destination already exists.");
  }
  await mkdir(dirname(destination), { recursive: true });
  const branchExists = await localBranchExists(payload.repoRoot, branch);
  const gitArgs = branchExists
    ? ["worktree", "add", destination, branch]
    : ["worktree", "add", "-b", branch, destination, payload.baseBranch || "HEAD"];
  await execGit(payload.repoRoot, gitArgs);
  if (!branchExists) {
    await runWarningStep(warnings, "Failed to save branch base ref", () =>
      saveBranchBaseRef(destination, branch, payload.baseBranch),
    );
  }
  await runWarningStep(warnings, "Failed to start untracked files copy job", () =>
    startCopyWorker(payload, destination),
  );
  return destination;
}

/**
 * app-server のポートを解決する
 */
function resolveAppServerPort() {
  const rawPort = process.env.WORKTREE_DECK_CODEX_APP_SERVER_PORT?.trim();
  const port = rawPort ? Number(rawPort) : DEFAULT_CODEX_APP_SERVER_PORT;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return DEFAULT_CODEX_APP_SERVER_PORT;
  }
  return port;
}

/**
 * app-server endpoint を作る
 */
function buildAppServerEndpoint(port) {
  return `ws://127.0.0.1:${port}`;
}

/**
 * app-server ready URL を作る
 */
function buildReadyUrl(port) {
  return `http://127.0.0.1:${port}/readyz`;
}

/**
 * ready URL が 2xx を返すか判定する
 */
async function isHttpOk(url) {
  return new Promise((resolve) => {
    const request = get(url, (response) => {
      response.resume();
      resolve((response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300);
    });
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * 少し待つ
 */
async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * app-server が ready になるまで待つ
 */
async function waitForAppServerReady(port) {
  const deadline = Date.now() + APP_SERVER_READY_TIMEOUT_MS;
  const readyUrl = buildReadyUrl(port);
  while (Date.now() < deadline) {
    if (await isHttpOk(readyUrl)) {
      return;
    }
    await delay(150);
  }
  throw new Error("Codex app-server did not become ready.");
}

/**
 * app-server を必要なら起動する
 */
async function ensureCodexAppServer() {
  const port = resolveAppServerPort();
  if (await isHttpOk(buildReadyUrl(port))) {
    return buildAppServerEndpoint(port);
  }
  const endpoint = buildAppServerEndpoint(port);
  await new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn("codex", ["app-server", "--listen", endpoint], {
      detached: true,
      env: { ...process.env, PATH: buildCommandPath(process.env.PATH) },
      stdio: "ignore",
    });
    child.once("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(normalizeMissingCommandError(error, "codex"));
    });
    child.unref();
    waitForAppServerReady(port)
      .then(() => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      })
      .catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(error);
      });
  });
  return endpoint;
}

/**
 * JSON-RPC client を作る
 */
async function createJsonRpcClient(endpoint) {
  if (!globalThis.WebSocket) {
    throw new Error("WebSocket is not available in this runtime.");
  }
  const socket = new globalThis.WebSocket(endpoint);
  let nextId = 1;
  const pending = new Map();
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Codex app-server connection timed out.")), JSON_RPC_TIMEOUT_MS);
    socket.onopen = () => {
      clearTimeout(timeout);
      resolve();
    };
    socket.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to connect to Codex app-server."));
    };
  });
  socket.onmessage = (event) => {
    const message = JSON.parse(typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8"));
    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }
    pending.delete(message.id);
    clearTimeout(entry.timeout);
    if (message.error) {
      entry.reject(new Error(message.error.message || "Codex app-server request failed."));
      return;
    }
    entry.resolve(message.result);
  };
  socket.onerror = () => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error("Codex app-server connection failed."));
    }
    pending.clear();
  };
  socket.onclose = () => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error("Codex app-server connection closed."));
    }
    pending.clear();
  };
  return {
    request(method, params) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Codex app-server request timed out: ${method}`));
        }, JSON_RPC_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timeout });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

/**
 * Codex 初回セッションを開始する
 */
async function startCodexSession(payload, worktreePath, onThreadStarted) {
  const client = await createJsonRpcClient(await ensureCodexAppServer());
  try {
    await client.request("initialize", {
      clientInfo: { name: "worktree-deck", version: "0.0.0" },
      capabilities: null,
    });
    const threadResult = await client.request("thread/start", {
      model: payload.metadata.model || null,
      serviceTier: payload.metadata.serviceTier || "default",
      cwd: worktreePath,
      approvalPolicy: payload.metadata.approvalPolicy,
      approvalsReviewer: payload.metadata.approvalsReviewer,
      sandbox: payload.metadata.sandboxMode,
      config: { web_search: payload.metadata.webSearch },
      serviceName: "worktree-deck",
      baseInstructions: null,
      developerInstructions: null,
      personality: null,
      ephemeral: false,
      sessionStartSource: "startup",
      threadSource: "user",
      environments: null,
      dynamicTools: null,
      experimentalRawEvents: false,
      persistExtendedHistory: false,
    });
    const threadId = typeof threadResult.thread?.id === "string" ? threadResult.thread.id.trim() : "";
    if (!threadId) {
      throw new Error("Codex app-server did not return a thread id.");
    }
    if (onThreadStarted) {
      await onThreadStarted(threadId, client);
    }
    await client.request("turn/start", {
      threadId,
      input: buildCodexTurnInput(payload),
      model: payload.metadata.model || null,
      serviceTier: payload.metadata.serviceTier || "default",
      effort: payload.metadata.reasoningEffort,
    });
    return threadId;
  } finally {
    client.close();
  }
}

/**
 * Codex の turn/start 入力を画像添付込みで組み立てる
 */
function buildCodexTurnInput(payload) {
  const imagePaths = Array.isArray(payload.imagePaths)
    ? payload.imagePaths.filter((path) => typeof path === "string" && path.trim()).map((path) => path.trim())
    : [];
  return [
    { type: "text", text: payload.initialPrompt, text_elements: [] },
    ...imagePaths.map((path) => ({ type: "localImage", path })),
  ];
}

/**
 * CLI 引数から payload を復元する
 */
async function parsePayload() {
  const statePath = process.argv[2]?.trim();
  if (!statePath) {
    throw new Error("Auto Start job state path is required.");
  }
  const payload = await readJobStateByPath(statePath);
  payload.statePath = statePath;
  if (!payload.id || !payload.statePath || !payload.repoRoot || !payload.baseBranch || !payload.initialPrompt) {
    throw new Error("Auto Start job payload is invalid.");
  }
  return payload;
}

/**
 * worker の主処理を実行する
 */
async function main() {
  const statePath = process.argv[2]?.trim() || null;
  let payload = null;
  let branchGenerationWarning = null;
  let sessionTitleGenerationWarning = null;
  const warnings = [];
  try {
    payload = await parsePayload();
    await writeJobState(payload, { status: "running", startedAt: new Date().toISOString() });
    let branch;
    let sessionTitle;
    try {
      const metadata = await generateAutoStartMetadata(payload);
      branch = metadata.branch;
      sessionTitle = metadata.sessionTitle;
    } catch (error) {
      branchGenerationWarning = extractErrorMessage(error);
      sessionTitleGenerationWarning = branchGenerationWarning;
      branch = buildFallbackBranchName(payload.initialPrompt);
      sessionTitle = buildFallbackSessionTitle(payload.initialPrompt);
    }
    branch = resolveAvailableBranchName(branch, await listLocalBranches(payload.repoRoot));
    await writeJobState(payload, { status: "creating-worktree", branch, sessionTitle });
    const worktreePath = await createWorktree(payload, branch, warnings);
    await runWarningStep(warnings, "Failed to save worktree base ref", () =>
      saveWorktreeBaseRef(payload, worktreePath, payload.baseBranch),
    );
    await runWarningStep(warnings, "Failed to save open app", () =>
      saveOpenApp(payload, worktreePath, payload.openApp),
    );
    await writeJobState(payload, { status: "starting-codex", branch, worktreePath, warnings });
    const threadId = await startCodexSession(payload, worktreePath, async (startedThreadId, client) => {
      await runWarningStep(warnings, "Failed to save Codex thread", () =>
        saveOpenApp(payload, worktreePath, payload.openApp, payload.openApp === "codex-app" ? startedThreadId : null),
      );
      await runWarningStep(warnings, "Failed to save session title", () =>
        saveSessionTitle(payload, worktreePath, startedThreadId, sessionTitle),
      );
      await runWarningStep(warnings, "Failed to set Codex thread title", () =>
        setCodexThreadName(client, startedThreadId, sessionTitle),
      );
      await writeJobState(payload, {
        status: "starting-turn",
        branch,
        sessionTitle,
        worktreePath,
        threadId: startedThreadId,
        warnings,
      });
    });
    await writeJobState(payload, {
      status: "succeeded",
      branch,
      sessionTitle,
      worktreePath,
      threadId,
      branchGenerationWarning,
      sessionTitleGenerationWarning,
      warnings,
      finishedAt: new Date().toISOString(),
    });
    notify("Auto Start completed", formatCompletionNotificationMessage(branch, sessionTitle, branchGenerationWarning));
  } catch (error) {
    const message = extractErrorMessage(error);
    const patch = {
      status: "failed",
      errorMessage: message,
      branchGenerationWarning,
      sessionTitleGenerationWarning,
      warnings,
      finishedAt: new Date().toISOString(),
    };
    if (payload) {
      await writeJobState(payload, patch);
    } else if (statePath) {
      await writeJobStateByPath(statePath, patch);
    }
    notify("Auto Start failed", message);
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exitCode = 1;
});
