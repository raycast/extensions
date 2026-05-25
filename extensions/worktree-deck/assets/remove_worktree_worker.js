#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const { readFile, rm, writeFile } = require("node:fs/promises");
const { basename, dirname, normalize } = require("node:path");

/**
 * 削除 job の現在状態を読み込む
 */
async function readJobState(payload) {
  try {
    return JSON.parse(await readFile(payload.statePath, "utf8"));
  } catch {
    return {
      id: payload.id,
      repoRoot: payload.repoRoot,
      worktreePath: payload.worktreePath,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * 削除 job の状態を書き込む
 */
async function writeJobState(payload, patch) {
  const current = await readJobState(payload);
  await writeFile(payload.statePath, JSON.stringify({ ...current, ...patch }, null, 2), "utf8");
}

/**
 * child process の stderr を英語エラーとして返す
 */
function buildProcessError(command, args, code, stderr) {
  const message = stderr.trim() || `${command} failed with exit code ${code ?? "unknown"}.`;
  return new Error(`${message}\nCommand: ${command} ${args.join(" ")}`);
}

/**
 * spawn ENOENT を git 未導入の案内エラーへ変換する
 */
function normalizeGitCommandError(error) {
  if (error && error.code === "ENOENT") {
    return new Error("Git is required to manage worktrees. Install Git and ensure it is available in PATH.");
  }
  return error;
}

/**
 * git コマンドをバッファ上限なしで実行する
 */
async function execGit(repoRoot, gitArgs) {
  return new Promise((resolve, reject) => {
    const commandRoot = resolveRepositoryCommandRoot(repoRoot);
    const args = ["-C", commandRoot, ...gitArgs];
    const child = spawn("git", args, { cwd: commandRoot });
    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
    });
    child.on("error", (error) => reject(normalizeGitCommandError(error)));
    child.on("close", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(buildProcessError("git", args, code, stderr));
    });
  });
}

/**
 * git コマンド実行に使える repo root へ補正する
 */
function resolveRepositoryCommandRoot(repoRoot) {
  const normalized = normalize(repoRoot).replace(/\/+$/, "");
  const worktreesDir = dirname(normalized);
  const gitDir = dirname(worktreesDir);
  if (basename(worktreesDir) === "worktrees" && basename(gitDir) === ".git") {
    return dirname(gitDir);
  }
  return repoRoot;
}

/**
 * 例外情報からエラーメッセージを抽出する
 */
function extractErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

/**
 * worktree remove の失敗理由を分類する
 */
function classifyWorktreeRemoveError(error) {
  const message = extractErrorMessage(error).toLowerCase();
  if (message.includes("contains modified or untracked files")) {
    return "dirty";
  }
  if (message.includes("failed to delete") && message.includes("directory not empty")) {
    return "directory-not-empty";
  }
  if (message.includes("locked working tree") || message.includes("cannot remove a locked")) {
    return "locked";
  }
  if (message.includes("is a main working tree")) {
    return "main-worktree";
  }
  if (message.includes("does not exist") || message.includes("no such file or directory")) {
    return "not-found";
  }
  return "unknown";
}

/**
 * worktree remove 後に残った ignored/untracked ファイルを削除する
 */
async function removeRemainingWorktreeDirectory(payload) {
  await rm(payload.worktreePath, { recursive: true, force: true });
}

/**
 * remove の git 引数を組み立てる
 */
function buildWorktreeRemoveGitArgs(payload) {
  const gitArgs = ["worktree", "remove"];
  if (payload.force === true) {
    gitArgs.push("--force");
  }
  gitArgs.push(payload.worktreePath);
  return gitArgs;
}

/**
 * worktree remove を実行する
 */
async function runWorktreeRemove(payload) {
  const gitArgs = buildWorktreeRemoveGitArgs(payload);
  try {
    return await execGit(payload.repoRoot, gitArgs);
  } catch (error) {
    const kind = classifyWorktreeRemoveError(error);
    if (kind === "dirty") {
      throw new Error("Working tree has modified or untracked files.");
    }
    if (kind === "main-worktree") {
      throw new Error("Cannot remove the main working tree.");
    }
    if (kind === "directory-not-empty") {
      await removeRemainingWorktreeDirectory(payload);
      return { stdout: "", stderr: "Removed remaining worktree directory." };
    }
    if (kind === "locked") {
      throw new Error("Working tree is locked.");
    }
    if (kind === "not-found") {
      await execGit(payload.repoRoot, ["worktree", "prune"]);
      return execGit(payload.repoRoot, gitArgs);
    }
    throw error;
  }
}

/**
 * ローカルブランチが存在するか判定する
 */
async function localBranchExists(payload) {
  try {
    await execGit(payload.repoRoot, ["show-ref", "--verify", `refs/heads/${payload.branch}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * リモート一覧を取得する
 */
async function listRemotes(payload) {
  try {
    const { stdout } = await execGit(payload.repoRoot, ["remote"]);
    return stdout
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  } catch {
    return [];
  }
}

/**
 * git config の値を取得する
 */
async function readGitConfigValue(payload, key) {
  try {
    const { stdout } = await execGit(payload.repoRoot, ["config", "--get", key]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * 削除対象 remote を選ぶ
 */
function selectRemoteName(remotes, configuredRemote) {
  if (configuredRemote && remotes.includes(configuredRemote)) {
    return configuredRemote;
  }
  if (remotes.includes("origin")) {
    return "origin";
  }
  return remotes[0] ?? null;
}

/**
 * merge ref から remote branch 名を解決する
 */
function resolveRemoteBranchName(mergeRef, fallbackBranch) {
  const prefix = "refs/heads/";
  if (mergeRef && mergeRef.startsWith(prefix)) {
    const branch = mergeRef.slice(prefix.length).trim();
    if (branch) {
      return branch;
    }
  }
  return fallbackBranch;
}

/**
 * リモートブランチが存在するか判定する
 */
async function remoteBranchExists(payload, remote, branch) {
  try {
    const { stdout } = await execGit(payload.repoRoot, ["ls-remote", "--heads", remote, branch]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * 指定された branch 削除を実行する
 */
async function deleteBranches(payload) {
  if (!payload.branch) {
    return;
  }
  if (payload.deleteBranch === true && (await localBranchExists(payload))) {
    await execGit(payload.repoRoot, ["branch", "-D", payload.branch]);
  }
  if (payload.deleteRemoteBranch !== true) {
    return;
  }
  const remotes = await listRemotes(payload);
  const configuredRemote = await readGitConfigValue(payload, `branch.${payload.branch}.remote`);
  const remote = selectRemoteName(remotes, configuredRemote);
  if (!remote) {
    return;
  }
  const mergeRef = await readGitConfigValue(payload, `branch.${payload.branch}.merge`);
  const remoteBranch = resolveRemoteBranchName(mergeRef, payload.branch);
  if (await remoteBranchExists(payload, remote, remoteBranch)) {
    await execGit(payload.repoRoot, ["push", remote, "--delete", remoteBranch]);
  }
}

/**
 * CLI 引数から payload を復元する
 */
function parsePayload() {
  const rawPayload = process.argv[2];
  if (!rawPayload) {
    throw new Error("Remove job payload is required.");
  }
  const payload = JSON.parse(rawPayload);
  if (!payload.id || !payload.repoRoot || !payload.worktreePath || !payload.statePath) {
    throw new Error("Remove job payload is invalid.");
  }
  return payload;
}

/**
 * worker の主処理を実行する
 */
async function main() {
  const payload = parsePayload();
  await writeJobState(payload, {
    status: "running",
    startedAt: new Date().toISOString(),
  });
  try {
    const result = await runWorktreeRemove(payload);
    await deleteBranches(payload);
    await writeJobState(payload, {
      status: "succeeded",
      stdout: result.stdout,
      stderr: result.stderr,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await writeJobState(payload, {
      status: "failed",
      errorMessage: message,
      finishedAt: new Date().toISOString(),
    });
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exitCode = 1;
});
