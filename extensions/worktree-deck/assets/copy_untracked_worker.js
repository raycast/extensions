#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const { cp, lstat, mkdir, readFile, readlink, rm, symlink, writeFile } = require("node:fs/promises");
const { dirname, join } = require("node:path");

/**
 * コピー job の状態を書き込む
 */
async function writeJobState(payload, patch) {
  const current = await readJobState(payload);
  await writeFile(payload.statePath, JSON.stringify({ ...current, ...patch }, null, 2), "utf8");
}

/**
 * コピー job の現在状態を読み込む
 */
async function readJobState(payload) {
  try {
    return JSON.parse(await readFile(payload.statePath, "utf8"));
  } catch {
    return {
      id: payload.id,
      repoRoot: payload.repoRoot,
      destination: payload.destination,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }
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
 * git ls-files をバッファ上限なしで実行する
 */
async function execGitLsFiles(repoRoot, gitArgs) {
  return new Promise((resolve, reject) => {
    const args = ["-C", repoRoot, "ls-files", "-z", ...gitArgs];
    const child = spawn("git", args, { cwd: repoRoot });
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
      if (code === 0) {
        resolve(Buffer.concat(stdoutChunks));
        return;
      }
      reject(buildProcessError("git", args, code, Buffer.concat(stderrChunks).toString("utf8")));
    });
  });
}

/**
 * git ls-files の結果を相対パス一覧へ変換する
 */
async function listGitFilePaths(repoRoot, gitArgs) {
  const stdout = await execGitLsFiles(repoRoot, gitArgs);
  return stdout
    .toString("utf8")
    .split("\0")
    .filter((entry) => entry.length > 0);
}

/**
 * 未追跡/ignored ファイルの相対パスを取得する
 */
async function listUntrackedAndIgnoredPaths(repoRoot) {
  const untrackedPaths = await listGitFilePaths(repoRoot, ["--others", "--exclude-standard"]);
  const ignoredPaths = await listGitFilePaths(repoRoot, ["--others", "--ignored", "--exclude-standard"]);
  return Array.from(new Set([...untrackedPaths, ...ignoredPaths]));
}

/**
 * ファイル種別を保ったままコピーする
 */
async function copyPathPreservingSymlink(source, target) {
  const sourceStat = await lstat(source);
  if (sourceStat.isSymbolicLink()) {
    const linkTarget = await readlink(source);
    await rm(target, { recursive: true, force: true });
    await symlink(linkTarget, target);
    return;
  }
  await cp(source, target, { recursive: true, force: true });
}

/**
 * 未追跡/ignored ファイルを新しい worktree へコピーする
 */
async function copyUntrackedAndIgnoredFiles(payload) {
  const relativePaths = await listUntrackedAndIgnoredPaths(payload.repoRoot);
  let copiedCount = 0;
  for (const relativePath of relativePaths) {
    const source = join(payload.repoRoot, relativePath);
    const target = join(payload.destination, relativePath);
    try {
      await lstat(source);
    } catch {
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await copyPathPreservingSymlink(source, target);
    copiedCount += 1;
  }
  return copiedCount;
}

/**
 * CLI 引数から payload を復元する
 */
function parsePayload() {
  const rawPayload = process.argv[2];
  if (!rawPayload) {
    throw new Error("Copy job payload is required.");
  }
  const payload = JSON.parse(rawPayload);
  if (!payload.id || !payload.repoRoot || !payload.destination || !payload.statePath) {
    throw new Error("Copy job payload is invalid.");
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
    const copiedCount = await copyUntrackedAndIgnoredFiles(payload);
    await writeJobState(payload, {
      status: "succeeded",
      copiedCount,
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
