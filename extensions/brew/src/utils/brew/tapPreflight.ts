/**
 * Look inside a tap's repository before it is added.
 *
 * `brew tap` accepts any git repository and exits 0 even when it holds no
 * formulae, casks or commands (`Tap#install` just prints "Tapped (…)"), so a
 * pasted app repository is added, and trusted, as an empty tap. Reading the
 * file list first lets Manage Taps say what a repo holds, and, when it is not
 * a tap, offer what the user most likely meant: the install line in its
 * README, or a tap the same owner publishes.
 *
 * The reading itself is a `RepoReader` (git in practice, `tapRepoGit.ts`), so
 * this file holds only the decisions and is tested with a fake one. Every
 * failure to look reads as `unchecked`, never as a verdict, and the caller
 * falls back to what it did before: offer the add, and check after tapping.
 */

import { getErrorMessage } from "../errors";
import { formatCount } from "../text";
import { installTargetFor, packageNameOf, parseTapName, tapOwner, type Tap, type TapTarget } from "./taps";
import { gitReader } from "./tapRepoGit";

/** What brew would find in a tap, as bare names. */
export interface TapContents {
  formulae: string[];
  casks: string[];
  commands: string[];
}

/** A tap the user probably meant instead of the one they pasted. */
export interface TapLead {
  target: TapTarget;
  contents: TapContents;
  /** Where the lead came from: the pasted repo's README, or the same owner's `homebrew-*` repo. */
  source: "readme" | "owner";
  /** The lead's tap belongs to someone other than the owner of the pasted repo. */
  differentOwner: boolean;
}

export type Preflight =
  /** A tap with something in it. A named package, if any, is in it. */
  | { kind: "tap"; contents: TapContents }
  /** A tap, but without the package the input named. `contents` holds what it does have. */
  | { kind: "missing-package"; contents: TapContents; package: string }
  /** The repository exists and brew would find nothing in it. `repo` is it, without `https://`. */
  | { kind: "not-a-tap"; repo: string; lead?: TapLead; incomplete?: true }
  /**
   * No repository there, or none these credentials can read: misspelled, or
   * private. `repo` is where brew would clone from. `lead` is the owner's tap,
   * when a bare `user/name` turns out to name a package in it rather than a
   * tap (`thousandflowers/rcc`).
   */
  | { kind: "not-found"; repo: string; lead?: TapLead; incomplete?: true }
  /** Could not look: git missing, offline, too slow, or an answer it couldn't read. */
  | { kind: "unchecked"; reason: string };

/** One repository, read without checking it out: its file paths and its README's text. */
export type RepoRead =
  | { kind: "ok"; paths: string[]; readme: string }
  | { kind: "not-found" }
  | { kind: "unchecked"; reason: string };

/**
 * Reads one repository by clone URL. Injectable for tests. `readme: false`
 * skips the README, which costs one more fetch and matters only for the
 * repository that was pasted, never for a lead.
 */
export type RepoReader = (url: string, opts: { readme: boolean; signal?: AbortSignal }) => Promise<RepoRead>;

const nameOf = (path: string) => (path.split("/").pop() ?? path).replace(/\.rb$/, "");
const sorted = (names: string[]) => [...new Set(names)].sort();

/**
 * Brew's own rules (`tap.rb`): formulae come from the first of `Formula/`,
 * `HomebrewFormula/` or the top level that exists, recursively except at the
 * top level; casks from `Casks/`, recursively; commands from `cmd/`.
 */
export function tapContents(allPaths: string[]): TapContents {
  // brew's `Pathname.glob` skips dotfiles and dot-directories.
  const paths = allPaths.filter((p) => !p.split("/").some((segment) => segment.startsWith(".")));
  const under = (dir: string) => new RegExp(`^${dir}/(?:[^/]+/)*[^/]+\\.rb$`);
  // Which folder brew reads is decided by the folder existing (`directory?`),
  // so a hidden file such as `Formula/.gitkeep` still counts here.
  const formulaDir = ["Formula", "HomebrewFormula"].find((dir) => allPaths.some((p) => p.startsWith(`${dir}/`)));
  const formula = formulaDir ? under(formulaDir) : /^[^/]+\.rb$/;
  const cask = under("Casks");
  return {
    formulae: sorted(paths.filter((p) => formula.test(p)).map(nameOf)),
    casks: sorted(paths.filter((p) => cask.test(p)).map(nameOf)),
    commands: sorted(paths.filter((p) => /^cmd\/[^/]+$/.test(p)).map((p) => p.slice(4))),
  };
}

/** What an added tap provides, from `brew tap-info`. */
export const contentsOfTap = (tap: Tap): TapContents => ({
  formulae: tap.formula_names,
  casks: tap.cask_tokens,
  commands: tap.command_files ?? [],
});

export const isEmptyTap = (c: TapContents) => c.formulae.length + c.casks.length + c.commands.length === 0;

/** "4 formulae, 1 cask" — what a tap provides, leaving out a kind it has none of. */
export function contentsText(contents: TapContents): string {
  const parts = [
    contents.formulae.length > 0 ? formatCount(contents.formulae.length, "formula", "formulae") : undefined,
    contents.casks.length > 0 ? formatCount(contents.casks.length, "cask") : undefined,
    contents.commands.length > 0 ? formatCount(contents.commands.length, "command") : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No packages";
}

/** A word that names where a tap is cloned from, as `parseTapName` reads one. */
const URL_WORD = /^(?:[a-z][a-z0-9+.-]*:\/\/|(?:www\.)?github\.com\/)/i;

/**
 * The arguments of one README command, up to the first word that isn't one,
 * as one line per name: flags, the first name, for `brew install` each later
 * qualified package, and for `brew tap` a URL right after the name. Only a
 * qualified name continues an install line, since a bare word there may be
 * prose. Prose after the command (`for macOS/Linux`, `(see docs/install)`, a
 * `#` comment with a link) never stands in for a name or the URL.
 */
function commandArguments(verb: string, rest: string): string[] {
  const flags: string[] = [];
  const names: string[] = [];
  let url: string | undefined;
  for (const raw of rest.trim().split(/\s+/).filter(Boolean)) {
    const word = raw.replace(/[,.:]+$/, "");
    if (word.startsWith("-")) flags.push(word);
    else if (names.length === 0) names.push(word);
    else if (verb === "install" && parseTapName(word)?.package) names.push(word);
    else if (verb === "tap" && url === undefined && URL_WORD.test(word)) url = word;
    else break;
  }
  return names.length > 0 ? names.map((name) => [...flags, name, ...(url ? [url] : [])].join(" ")) : [flags.join(" ")];
}

/**
 * Taps and packages a README tells people to install, in order, each once.
 * Each `brew install` or `brew tap` command is cut at the first backtick or
 * shell separator, then at the first word that isn't an argument, and read the
 * same way a paste is (`parseTapName`), so official packages such as
 * `brew install wget` drop out.
 */
export function readmeLeads(readme: string): TapTarget[] {
  const commands = readme.split(/&&|\|\||[;|`\n]/).flatMap((part) => {
    const command = /\bbrew\s+(install|tap)\b(.*)/.exec(part);
    return command ? commandArguments(command[1], command[2]) : [];
  });
  const targets = commands.flatMap((line) => parseTapName(line) ?? []);
  // A `brew tap x/y <url>` line says where every `x/y/...` install comes from.
  const urls = new Map<string, string>();
  for (const target of targets) if (target.url && !urls.has(target.tap)) urls.set(target.tap, target.url);
  // `brew tap x/y` followed by `brew install x/y/pkg` is one instruction, so a
  // tap line stands for its tap's first install line rather than for the bare tap.
  const firstInstall = (tap: string) => targets.find((target) => target.tap === tap && target.package);

  const leads: TapTarget[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    const lead = (!target.package && firstInstall(target.tap)) || target;
    const url = lead.url ?? urls.get(lead.tap);
    const key = [lead.tap, lead.package, lead.cask, url].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    leads.push(url ? { ...lead, url } : lead);
  }
  return leads;
}

/** Where `brew tap` clones a target from (`Tap#default_remote` when no URL is given). */
export function cloneUrl(target: TapTarget): string {
  if (target.url) return target.url;
  const [user, repo] = target.tap.split("/");
  return `https://github.com/${user}/homebrew-${repo}`;
}

/** A clone URL as people read it, and as two URLs are compared: no scheme, no `.git`. */
export const shortUrl = (url: string) =>
  url
    .replace(/^https:\/\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");

/** `owner/name` of a GitHub repository, where the owner's other taps can be guessed at. */
const githubRepo = (url: string) => /^github\.com\/([^/]+)\/([^/]+)$/i.exec(shortUrl(url));

/**
 * Two clone URLs name the same repository when these match. GitHub ignores
 * case in owner and repository names; another host may not, so there only the
 * host name is case-insensitive.
 */
function repoKey(url: string): string {
  const short = shortUrl(url);
  if (githubRepo(url)) return short.toLowerCase();
  const slash = short.indexOf("/");
  return slash < 0 ? short.toLowerCase() : short.slice(0, slash).toLowerCase() + short.slice(slash);
}

/**
 * Reads already made, per reader, so editing a package name reads its
 * repository once rather than once per pause. Only settled answers that cannot
 * change in a moment are kept: "couldn't look", and a read that was canceled,
 * are asked again.
 */
const answered = new WeakMap<RepoReader, Map<string, RepoRead>>();

/**
 * Drop every remembered read, for Refresh: a repository that was not found
 * may be readable once git is signed in, and nothing else would ask again.
 */
export function forgetRepoReads(reader: RepoReader = gitReader): void {
  answered.delete(reader);
}

type Read = (url: string, readme: boolean) => Promise<RepoRead>;

function remembered(reader: RepoReader, signal?: AbortSignal): Read {
  let cache = answered.get(reader);
  if (!cache) answered.set(reader, (cache = new Map()));
  const memo = cache;
  // Reads this check has started, so two candidates that name one repository
  // (a README lead and the owner's `tap`) share one clone. Kept per check, not
  // in `memo`: each check has its own abort signal, and a read canceled with
  // one check must not become the answer to the next.
  const pending = new Map<string, Promise<RepoRead>>();
  return (url, readme) => {
    const key = repoKey(url);
    // A read that fetched the README also answers one that doesn't need it.
    const known = memo.get(`${key} readme`) ?? (readme ? undefined : memo.get(key));
    if (known) return Promise.resolve(known);
    const started = pending.get(`${key} readme`) ?? (readme ? undefined : pending.get(key));
    if (started) return started;
    const slot = readme ? `${key} readme` : key;
    const read = reader(url, { readme, signal })
      .catch((err: unknown): RepoRead => ({ kind: "unchecked", reason: getErrorMessage(err) }))
      .then((result) => {
        if (result.kind !== "unchecked" && !signal?.aborted) memo.set(slot, result);
        return result;
      });
    pending.set(slot, read);
    return read;
  };
}

type Contents = {
  contents: TapContents;
  /** Names brew also resolves here: `Aliases/<name>` files. */
  aliases: string[];
  /** The tap renames or moves packages, so a name missing from the files may still resolve. */
  renames: boolean;
  readme: string;
};

async function readTap(url: string, read: Read, readme = false): Promise<Contents | Exclude<RepoRead, { kind: "ok" }>> {
  const repo = await read(url, readme);
  if (repo.kind !== "ok") return repo;
  return {
    contents: tapContents(repo.paths),
    aliases: repo.paths.filter((p) => /^Aliases\/[^/]+$/.test(p)).map((p) => p.slice(8)),
    renames: repo.paths.some((p) => ["formula_renames.json", "cask_renames.json", "tap_migrations.json"].includes(p)),
    readme: repo.readme,
  };
}

/**
 * Whether a tap provides the package a target names. A name that is not a
 * file may still resolve, through an alias or a rename (`formulary.rb`), so a
 * tap with renames is never called missing: only a definite no counts.
 */
function hasPackage(read: Contents, target: TapTarget): boolean {
  const name = packageNameOf(target);
  if (!name) return true;
  const { formulae, casks } = read.contents;
  if (target.cask) return casks.includes(name) || read.renames;
  return [...formulae, ...casks, ...read.aliases].includes(name) || read.renames;
}

/** A candidate tap, if it exists, has something in it, and holds the package it names. */
async function checkLead(
  candidate: TapTarget,
  source: TapLead["source"],
  from: string,
  read: Read,
): Promise<TapLead | "unchecked" | undefined> {
  const url = cloneUrl(candidate);
  if (repoKey(url) === repoKey(from)) return undefined;
  const tap = await readTap(url, read);
  if (!("contents" in tap)) return tap.kind === "unchecked" ? "unchecked" : undefined;
  if (isEmptyTap(tap.contents) || !hasPackage(tap, candidate)) return undefined;
  const owner = githubRepo(from)?.[1].toLowerCase();
  const differentOwner = owner !== undefined && tapOwner(candidate.tap) !== owner;
  return { target: candidate, contents: tap.contents, source, differentOwner };
}

/**
 * The first lead that checks out, in order. Candidates are read together;
 * order decides. `incomplete` when a candidate that would have come first
 * couldn't be read: the answer may change once it can, so it isn't final.
 */
async function firstLead(candidates: [TapTarget, TapLead["source"]][], from: string, read: Read): Promise<LeadSearch> {
  const found = await Promise.all(candidates.map(([candidate, source]) => checkLead(candidate, source, from, read)));
  const index = found.findIndex((result) => typeof result === "object");
  const before = index < 0 ? found : found.slice(0, index);
  const lead = index < 0 ? undefined : (found[index] as TapLead);
  return { lead, incomplete: before.includes("unchecked") };
}

type LeadSearch = { lead?: TapLead; incomplete: boolean };

/** What was meant, for a repository brew would find nothing in. */
function findLead(url: string, readme: string, target: TapTarget, read: Read) {
  // A README lead naming the same tap is kept: its URL may point somewhere
  // else. One that resolves back to this very repository is dropped in `checkLead`.
  const candidates: [TapTarget, TapLead["source"]][] = readmeLeads(readme)
    .slice(0, 3)
    .map((lead) => [lead, "readme"]);
  // The owner's own taps: a GitHub convention, so only for a GitHub repository.
  // They must hold the package that was asked for, when one was.
  const github = githubRepo(url);
  if (github) {
    const [, owner, name] = github;
    const wanted = packageNameOf(target);
    for (const sibling of [name.replace(/^homebrew-/i, ""), "tap"]) {
      const tap = { tap: `${owner}/${sibling}`.toLowerCase() };
      const candidate = wanted ? installTargetFor(tap, wanted, target.cask === true) : tap;
      candidates.push([candidate, "owner"]);
    }
  }
  return firstLead(candidates, url, read);
}

/**
 * `user/name` is brew's shorthand for the tap at `user/homebrew-name`, but
 * people also type it meaning "the package name from user". When there is no
 * such tap, look for the package in the owner's `homebrew-tap`, the
 * conventional home for a one-person tap.
 */
function ownerTapHolding(tapName: string, from: string, read: Read): Promise<LeadSearch> {
  const [owner, name] = tapName.split("/");
  if (name === "tap") return Promise.resolve({ incomplete: false });
  return firstLead([[installTargetFor({ tap: `${owner}/tap` }, name, false), "owner"]], from, read);
}

/** A not-a-tap or not-found answer, with its lead and whether it is final. */
function withLead<K extends "not-a-tap" | "not-found">(kind: K, repo: string, search: LeadSearch) {
  return {
    kind,
    repo,
    ...(search.lead ? { lead: search.lead } : {}),
    ...(search.incomplete ? { incomplete: true as const } : {}),
  };
}

/** What the repository a tap target points at holds, and what to offer if it is not a tap. */
export async function preflightTap(
  target: TapTarget,
  reader: RepoReader = gitReader,
  signal?: AbortSignal,
): Promise<Preflight> {
  const read = remembered(reader, signal);
  const url = cloneUrl(target);
  const repo = shortUrl(url);
  // Only this repository's README can matter, and only if it holds nothing.
  const tap = await readTap(url, read, true);
  if (!("contents" in tap)) {
    if (tap.kind !== "not-found") return tap;
    const search = target.url || target.package ? { incomplete: false } : await ownerTapHolding(target.tap, url, read);
    return withLead("not-found", repo, search);
  }
  if (isEmptyTap(tap.contents)) {
    return withLead("not-a-tap", repo, await findLead(url, tap.readme, target, read));
  }
  if (!hasPackage(tap, target)) {
    return { kind: "missing-package", contents: tap.contents, package: packageNameOf(target) ?? "" };
  }
  return { kind: "tap", contents: tap.contents };
}

/** Edit distance between two names. */
function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/** A tap's packages nearest a name it doesn't have, for "did you mean". Ties keep alphabetical order. */
export function closestPackages(contents: TapContents, name: string, limit = 5): { name: string; cask: boolean }[] {
  return [
    ...contents.formulae.map((n) => ({ name: n, cask: false })),
    ...contents.casks.map((n) => ({ name: n, cask: true })),
  ]
    .map((item) => ({ item, score: distance(name, item.name) }))
    .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map(({ item }) => item);
}
