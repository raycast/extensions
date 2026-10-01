#!/usr/bin/env node
/**
 * Release helpers for the Raycast Store workflow.
 *
 *   node scripts/release.mts check
 *   node scripts/release.mts sync --checkout <path> [--apply]
 *   node scripts/release.mts backfill --checkout <path> [--ref <git-ref>]
 *   node scripts/release.mts pr --checkout <path> [--title <title>] [--apply]
 *
 * Running a .mts file directly needs Node with TypeScript support (>= 22.18).
 * See docs/development/releasing.md for the full process.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const extensionDir = "extensions/easydict";
const checkoutEnvVar = "RAYCAST_EXTENSIONS_CHECKOUT";
/** Paths the mirror never copies; the Store target ignores them too. */
const excludedPrefixes = [".github/", ".claude/"];
const mirrorExcludes = [
  "--exclude=.git/",
  ...excludedPrefixes.map((prefix) => `--exclude=${prefix}`),
  "--filter=:- .gitignore",
];
/** Paths that must never reach the mirror, matched against the path part of an rsync item. */
const ignoredPaths = /(^|\/)(node_modules|dist|coverage)\/|(^|\/)\.env/;

function info(message: string) {
  console.log(message);
}

function ok(message: string) {
  console.log(`✔ ${message}`);
}

function warn(message: string) {
  console.log(`▲ ${message}`);
}

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function git(dir: string, args: string[]): string {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();
}

function resolveCheckout(argument?: string): string {
  const value = argument ?? process.env[checkoutEnvVar];
  if (!value) fail(`Pass --checkout <path> or set ${checkoutEnvVar}`);
  const checkout = path.resolve(value);
  if (!existsSync(path.join(checkout, ".git"))) fail(`${checkout} is not a git checkout`);
  if (!existsSync(path.join(checkout, extensionDir))) fail(`${checkout} does not contain ${extensionDir}`);
  return checkout;
}

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  let checkout: string | undefined;
  let ref: string | undefined;
  let title: string | undefined;
  let branch: string | undefined;
  let remote: string | undefined;
  let apply = false;
  let help = false;

  const nextValue = (flagIndex: number, flag: string): string => {
    const candidate = rest[flagIndex + 1];
    if (!candidate || candidate.startsWith("--")) fail(`Missing value for ${flag}`);
    return candidate;
  };
  const inlineValue = (argument: string, flag: string): string => {
    const value = argument.slice(flag.length + 1);
    if (!value) fail(`Missing value for ${flag}`);
    return value;
  };

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--apply") apply = true;
    else if (argument === "--help" || argument === "-h") help = true;
    else if (argument === "--checkout") checkout = nextValue(index++, "--checkout");
    else if (argument.startsWith("--checkout=")) checkout = inlineValue(argument, "--checkout");
    else if (argument === "--ref") ref = nextValue(index++, "--ref");
    else if (argument.startsWith("--ref=")) ref = inlineValue(argument, "--ref");
    else if (argument === "--title") title = nextValue(index++, "--title");
    else if (argument.startsWith("--title=")) title = inlineValue(argument, "--title");
    else if (argument === "--branch") branch = nextValue(index++, "--branch");
    else if (argument.startsWith("--branch=")) branch = inlineValue(argument, "--branch");
    else if (argument === "--remote") remote = nextValue(index++, "--remote");
    else if (argument.startsWith("--remote=")) remote = inlineValue(argument, "--remote");
    else fail(`Unknown argument: ${argument}`);
  }
  return { command, checkout, ref, title, branch, remote, apply, help };
}

function releaseVersion(): string {
  const consts = readFileSync(path.join(repoRoot, "src/consts.ts"), "utf8");
  const version = /EASYDICT_VERSION = "([^"]+)"/.exec(consts)?.[1];
  if (!version) fail("Could not find EASYDICT_VERSION in src/consts.ts");
  return version;
}

/** check: validate the release version trio before opening the draft PR. */
function commandCheck() {
  const consts = readFileSync(path.join(repoRoot, "src/consts.ts"), "utf8");
  const version = releaseVersion();

  const changelog = readFileSync(path.join(repoRoot, "CHANGELOG.md"), "utf8");
  const entry = /^## \[v([^\]]+)\] - (.+)$/m.exec(changelog);
  if (!entry) fail("Could not find the top CHANGELOG entry, expected '## [vX.Y.Z] - ...'");
  const [, changelogVersion] = entry;

  if (changelogVersion !== version) {
    fail(`CHANGELOG entry (v${changelogVersion}) does not match EASYDICT_VERSION (v${version})`);
  }
  ok(`CHANGELOG and EASYDICT_VERSION agree on v${version}`);

  const changelogDate = entry[2].trim();
  if (changelogDate === "{PR_MERGE_DATE}") {
    ok("The {PR_MERGE_DATE} placeholder is intact");
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(changelogDate)) {
    ok(`The merge date is filled in (${changelogDate}) — expected after syncing back from the Store`);
  } else {
    fail(`The top CHANGELOG entry needs {PR_MERGE_DATE} or a filled date, found "${changelogDate}"`);
  }

  if (!consts.includes("## [v${EASYDICT_VERSION}]")) {
    fail("RELEASE_MARKDOWN has no '## [v${EASYDICT_VERSION}]' heading");
  }
  ok("RELEASE_MARKDOWN carries the same version");

  const branch = git(repoRoot, ["branch", "--show-current"]);
  if (!branch) warn("Detached HEAD; releases are prepared on dev/release");
  else if (branch === "dev/release") ok("On dev/release");
  else warn(`Current branch is ${branch}; releases are prepared on dev/release`);

  const status = git(repoRoot, ["status", "--porcelain"]).split("\n").filter(Boolean);
  const untracked = status.filter((line) => line.startsWith("??"));
  const modified = status.filter((line) => !line.startsWith("??"));
  if (modified.length) warn(`The working tree has ${modified.length} uncommitted path(s)`);
  if (untracked.length) warn(`${untracked.length} untracked path(s) will still be mirrored into the Store PR`);
  if (!modified.length && !untracked.length) ok("The working tree is clean");
}

function summarizeMirror(listing: string[]) {
  const created = listing.filter((line) => /^>f\+/.test(line)).length;
  const changed = listing.filter((line) => /^>f(?!\+)/.test(line)).length;
  const deleted = listing.filter((line) => line.startsWith("*deleting")).length;
  return `${created} new, ${changed} changed, ${deleted} deleted`;
}

/** The path part of an rsync itemized line; the flags and padding precede it. */
function itemPath(line: string): string {
  const space = line.indexOf(" ");
  return (space === -1 ? line : line.slice(space)).trim();
}

/** sync: mirror this repository into the Store checkout (dry run unless --apply). */
function commandSync(checkoutArgument: string | undefined, apply: boolean) {
  const checkout = resolveCheckout(checkoutArgument);
  const target = path.join(checkout, extensionDir);
  const base = ["-a", "--delete", ...mirrorExcludes];

  const listing = execFileSync("rsync", ["-n", "-i", ...base, `${repoRoot}/`, `${target}/`], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

  if (!listing.length) {
    ok("The checkout already matches this repository");
    return;
  }

  const leaked = listing.map(itemPath).filter((item) => ignoredPaths.test(item));
  if (leaked.length) fail(`Ignored paths leaked through the filter:\n${leaked.join("\n")}`);

  info(`Dry run: ${listing.length} changes (${summarizeMirror(listing)})`);
  for (const line of listing.slice(0, 20)) info(`  ${line}`);
  if (listing.length > 20) info(`  … ${listing.length - 20} more`);

  if (!apply) {
    info("\nPass --apply to mirror these changes into the checkout.");
    return;
  }

  execFileSync("rsync", [...base, `${repoRoot}/`, `${target}/`], { stdio: "inherit" });
  ok(`Mirrored into ${target}`);
  const status = git(checkout, ["status", "--ignored", "--short"]);
  info(status || "(the checkout is clean)");
  const branch = git(checkout, ["branch", "--show-current"]);
  info(branch ? `Checkout branch: ${branch}` : "(detached HEAD in the checkout)");
}

function treeBlobs(dir: string, revision: string): Map<string, string> {
  const output = execFileSync("git", ["-C", dir, "ls-tree", "-r", revision], { encoding: "utf8" });
  const blobs = new Map<string, string>();
  for (const line of output.split("\n")) {
    const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line);
    if (match) blobs.set(match[2], match[1]);
  }
  return blobs;
}

function ignoredFiles(files: string[]): Set<string> {
  if (!files.length) return new Set();
  try {
    const output = execFileSync("git", ["-C", repoRoot, "check-ignore", "--no-index", "--stdin"], {
      input: files.join("\n"),
      encoding: "utf8",
    });
    return new Set(output.split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

/** backfill: report the files the merged Store copy changed, so they can be pulled back. */
function commandBackfill(checkoutArgument: string | undefined, ref = "origin/main") {
  const checkout = resolveCheckout(checkoutArgument);
  const merged = treeBlobs(checkout, `${ref}:${extensionDir}`);
  if (!merged.size) fail(`Could not read ${ref}:${extensionDir} in the checkout`);

  const localFiles = git(repoRoot, ["ls-files"]).split("\n").filter(Boolean);
  const ignored = ignoredFiles(localFiles);
  const local = new Map<string, string>();
  for (const line of git(repoRoot, ["ls-files", "-s"]).split("\n")) {
    const match = /^\d+ ([0-9a-f]+) \d+\t(.+)$/.exec(line);
    if (match) local.set(match[2], match[1]);
  }

  const skipped = (file: string) => ignored.has(file) || excludedPrefixes.some((prefix) => file.startsWith(prefix));

  const differences: string[] = [];
  for (const [file, blob] of [...local].sort()) {
    if (skipped(file)) continue;
    const stored = merged.get(file);
    if (!stored) differences.push(`missing from the Store copy  ${file}`);
    else if (stored !== blob) differences.push(`changed in the Store copy  ${file}`);
  }
  for (const file of [...merged.keys()].sort()) {
    if (!skipped(file) && !local.has(file)) differences.push(`only in the Store copy     ${file}`);
  }

  if (!differences.length) {
    ok(`No differences against ${ref}`);
    return;
  }

  info(`Differences against ${ref}:`);
  for (const line of differences) info(`  ${line}`);
  info("\nPull one back with:");
  info(`  git -C ${checkout} show ${ref}:${extensionDir}/<path> > <path>`);
  info(
    "The CHANGELOG.md date and the recompressed metadata images are expected here; pull them back and commit them on dev/release.",
  );
}

function changelogSection(version: string): string {
  const changelog = readFileSync(path.join(repoRoot, "CHANGELOG.md"), "utf8");
  const heading = `## [v${version}]`;
  const start = changelog.indexOf(heading);
  if (start < 0) fail(`The CHANGELOG has no ${heading} entry`);
  const rest = changelog.slice(start);
  const next = rest.indexOf("\n## [v", 1);
  const section = next === -1 ? rest : rest.slice(0, next);
  return section.split("\n").slice(1).join("\n").trim();
}

function forkRemote(checkout: string, override?: string): { remote: string; account: string } {
  const remotes = git(checkout, ["remote"]).split("\n").filter(Boolean);
  const candidates = override
    ? [override]
    : ["fork", ...remotes.filter((name) => name !== "fork" && name !== "origin")];
  for (const remote of candidates) {
    if (!remotes.includes(remote)) continue;
    const url = git(checkout, ["remote", "get-url", remote]);
    const match = /github\.com[:/]([^/]+)\/(?:raycast-)?extensions(?:\.git)?$/.exec(url);
    if (match) return { remote, account: match[1] };
  }
  fail(
    override
      ? `Remote '${override}' does not point at a fork of raycast/extensions`
      : "No fork remote found; add one: git remote add fork git@github.com:<you>/raycast-extensions.git",
  );
}

function composeBody(template: string, version: string, section: string): string {
  const description = `Release v${version}.\n\n${section}`;
  return template
    .replace(/<!-- A summary of your change[\s\S]*?-->/, description)
    .replace(/^- \[ \] /gm, "- [x] ")
    .trim();
}

/** pr: compose the Store PR from the official template and open it. */
function commandPr(
  checkoutArgument: string | undefined,
  title: string | undefined,
  branch: string | undefined,
  remote: string | undefined,
  apply: boolean,
) {
  const checkout = resolveCheckout(checkoutArgument);
  const version = releaseVersion();

  let template: string;
  try {
    template = git(checkout, ["show", "origin/main:.github/pull_request_template.md"]);
  } catch {
    fail("Could not read .github/pull_request_template.md from origin/main; is the checkout fetched?");
  }

  const head = branch ?? git(checkout, ["branch", "--show-current"]);
  if (!head || head === "main") fail("Check out the release branch in the checkout, or pass --branch");
  const fork = forkRemote(checkout, remote);
  const pullRequestTitle = title ?? "Update easydict extension";
  const body = composeBody(template, version, changelogSection(version));

  info(`Title:   ${pullRequestTitle}`);
  info(`Remote:  ${fork.remote} (${fork.account})`);
  info(`Head:    ${fork.account}:${head} -> raycast/extensions:main`);
  info(`\n${body}\n`);

  if (!apply) {
    info("Pass --apply to open the pull request with gh.");
    return;
  }

  const bodyFile = path.join(os.tmpdir(), `easydict-store-pr-v${version}.md`);
  writeFileSync(bodyFile, `${body}\n`);
  execFileSync(
    "gh",
    [
      "pr",
      "create",
      "-R",
      "raycast/extensions",
      "--base",
      "main",
      "--head",
      `${fork.account}:${head}`,
      "--title",
      pullRequestTitle,
      "--body-file",
      bodyFile,
    ],
    { stdio: "inherit" },
  );
}

function printUsage() {
  info(`Usage: node scripts/release.mts <command> [options]

Commands:
  check                         Validate the release version trio on dev/release.
  sync --checkout <path>        Mirror this repository into the Store checkout.
       [--apply]                Write the changes; without it a dry run runs.
  backfill --checkout <path>    Report the files the merged Store copy changed.
           [--ref <git-ref>]    Revision to compare against (default: origin/main).
  pr --checkout <path>          Compose the Store PR from the official template.
     [--title <title>]          Default: "Update easydict extension".
     [--branch <branch>]        Default: the checkout's current branch.
     [--remote <name>]          Fork remote, auto-detected by default.
     [--apply]                  Open the PR with gh.

The checkout path can also be set with ${checkoutEnvVar}.`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printUsage();
} else {
  switch (args.command) {
    case "check":
      commandCheck();
      break;
    case "sync":
      commandSync(args.checkout, args.apply);
      break;
    case "backfill":
      commandBackfill(args.checkout, args.ref);
      break;
    case "pr":
      commandPr(args.checkout, args.title, args.branch, args.remote, args.apply);
      break;
    default:
      printUsage();
      if (args.command) process.exitCode = 1;
  }
}
