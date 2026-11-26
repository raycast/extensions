#!/usr/bin/env node
/**
 * Copies the extension into its own git repository, which is where
 * `npm run publish` has to run.
 *
 * Why not publish from integrations/raycast directly: `ray publish` (read in
 * @raycast/api 2.14, dist/commands/publish) works on the git repository
 * around the current folder. It refuses while anything in that repository is
 * uncommitted or untracked, it tags the repository's HEAD
 * (__raycast_latest_publish_*), and on a first publish it writes the subject
 * of every commit in `git log` into the pull request's commit message. In the
 * RedBison main repo that means the whole private history would land in a
 * public PR on raycast/extensions. A small repository holding only the
 * extension avoids all three.
 *
 *   npm run stage -- ~/src/redbison-raycast
 *
 * Re-run it after every change here, commit in the target, and publish from
 * there. The target's .git and node_modules are kept between runs.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const EXT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The repo the extension sits in: the main repo (integrations/raycast) or
// redbison-tools (raycast/). Staging inside either is refused the same way.
const ROOT = [resolve(EXT, "../.."), resolve(EXT, "..")].find((dir) => existsSync(join(dir, "cli/src/catalog.ts"))) ?? resolve(EXT, "..");
const target = process.argv[2] ? resolve(process.argv[2]) : "";

if (!target) {
  console.error("Usage: npm run stage -- <folder outside the RedBison repo>");
  process.exit(2);
}
if (target === ROOT || target.startsWith(ROOT + sep)) {
  console.error(`[stage] ${target} is inside the RedBison repo. Pick a folder outside it, e.g. ~/src/redbison-raycast`);
  process.exit(2);
}

/* What a published extension does not need; publish skips most of these too. */
const SKIP = new Set(["node_modules", "raycast-env.d.ts", ".DS_Store", "dist", ".git"]);
const KEEP_IN_TARGET = new Set([".git", "node_modules"]);

mkdirSync(target, { recursive: true });
for (const name of readdirSync(target)) {
  if (!KEEP_IN_TARGET.has(name)) rmSync(join(target, name), { recursive: true, force: true });
}
for (const name of readdirSync(EXT)) {
  if (SKIP.has(name)) continue;
  cpSync(join(EXT, name), join(target, name), {
    recursive: true,
    filter: (src) => !src.split(sep).some((part) => SKIP.has(part)),
  });
}

const git = (...args) => execFileSync("git", args, { cwd: target, encoding: "utf8" }).trim();
if (!existsSync(join(target, ".git"))) git("init", "-b", "main");

let email = "";
try {
  email = git("config", "user.email");
} catch {
  // not set anywhere
}

console.log(`[stage] Copied the extension to ${target}`);
console.log(
  email && email.endsWith("@users.noreply.github.com")
    ? `[stage] Commits there are authored as ${email}.`
    : `[stage] The pull request's commit will carry the git email "${email || "(none set)"}" publicly.\n` +
        `        To use your GitHub noreply address instead, run in ${target}:\n` +
        `          git config user.email "<id>+<username>@users.noreply.github.com"`,
);
console.log(`
Next, in ${target}:
  npm ci
  npm run build && npm run lint
  git add -A && git commit -m "RedBison extension"
  npm run publish`);
