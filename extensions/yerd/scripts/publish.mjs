#!/usr/bin/env node
/**
 * Store publish wrapper around `npx @raycast/api@latest publish`.
 *
 * `ray publish` copies this directory into its raycast/extensions fork clone
 * using a hardcoded exclude list (.git, node_modules, ...) and does NOT
 * respect .gitignore. Without intervention, local tooling entries either
 * break the copy (.codegraph symlinks resolve to a directory containing a
 * unix socket -> ENOTSUP) or leak private files into the public store PR
 * (.omo, fixtures/raw).
 *
 * This wrapper moves those entries into a temp dir, runs the real publish,
 * and restores them afterwards - including on publish failure or Ctrl-C.
 */
import { execSync, spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Entries `ray publish` must not see. Add new private/tooling paths here.
const STASH_ENTRIES = [
  ".codegraph",
  "metadata/.codegraph",
  ".omo",
  "fixtures/raw",
  "dist",
];

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

function entryExists(path) {
  // lstat so broken symlinks and sockets still count as present.
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

const stashDir = mkdtempSync(join(tmpdir(), "yerd-publish-stash-"));
const moved = []; // [repoPath, stashPath] pairs, in stash order.

function restore() {
  for (const [repoPath, stashPath] of moved.splice(0)) {
    try {
      renameSync(stashPath, repoPath);
    } catch (error) {
      console.error(
        `[publish] FAILED to restore ${repoPath}: ${message(error)}\n` +
          `[publish]   recover manually from ${stashPath}`,
      );
      process.exitCode = 1;
    }
  }
  if (entryExists(stashDir) && readdirSync(stashDir).length === 0) {
    rmdirSync(stashDir);
  }
}

// Ctrl-C is delivered to the whole foreground process group: ray dies, but
// keep this parent alive so spawnSync returns and restore() still runs.
process.on("SIGINT", () => {});
process.on("SIGTERM", () => {});
process.on("exit", restore);

let status = 1;
try {
  for (const entry of STASH_ENTRIES) {
    const repoPath = join(projectRoot, entry);
    if (!entryExists(repoPath)) {
      continue;
    }
    const stashPath = join(stashDir, entry.replaceAll("/", "__"));
    renameSync(repoPath, stashPath);
    moved.push([repoPath, stashPath]);
    console.log(`[publish] stashed ${entry}`);
  }

  // Finder litter would otherwise be copied into the store PR as well.
  execSync(
    'find . -name .DS_Store -not -path "./node_modules/*" -not -path "./.git/*" -delete',
    { cwd: projectRoot },
  );

  const result = spawnSync(
    "npx",
    ["@raycast/api@latest", "publish", ...process.argv.slice(2)],
    { cwd: projectRoot, stdio: "inherit" },
  );
  if (result.error) {
    throw result.error;
  }
  status = result.status ?? 1;
} catch (error) {
  console.error(`[publish] ${message(error)}`);
  status = 1;
} finally {
  restore();
}

process.exit(status);
