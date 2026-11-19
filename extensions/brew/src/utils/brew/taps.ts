/**
 * Third-party taps: listing them, and the commands that add, remove and trust
 * them.
 *
 * Trust is Homebrew's, not ours. Since Homebrew 7, `brew trust` gates loading
 * any non-official tap's formulae, casks and commands, at three scopes (a whole
 * tap, one formula, one cask), recorded in `~/.homebrew/trust.json`. A
 * fully-qualified install trusts that one package on its own, even under
 * `--dry-run` (verified on 7.0.6). From 7.0.14 reading is gated too:
 * `brew info` refuses a package from an untrusted tap, while `tap-info` still
 * lists its names (see `isUntrustedLoad`).
 */

import { ParseError } from "../errors";
import type { Cask, Formula, InstallableResults } from "../types";
import { fetchLogger } from "../logger";
import { execBrew } from "./commands";
import { shellQuote } from "./helpers";

/** One entry of `brew tap-info --json=v1`. Only the fields the UI reads. */
export interface Tap {
  /** `user/repo`, lowercased by brew. */
  name: string;
  user: string;
  repo: string;
  path: string;
  installed: boolean;
  official: boolean;
  /** Absent before Homebrew 7, which added `brew trust`. */
  trusted?: boolean;
  /** Fully qualified: `user/repo/name`. */
  formula_names: string[];
  /** Fully qualified: `user/repo/token`. */
  cask_tokens: string[];
  /** External brew commands the tap adds, as file paths. Null for an API-only official tap. */
  command_files: string[] | null;
  remote: string | null;
  /** Relative, as brew phrases it: "2 weeks ago". */
  last_commit: string | null;
}

/** `brew trust --json=v1`. Entries are fully qualified names. */
export interface TrustedEntries {
  taps: string[];
  formulae: string[];
  casks: string[];
}

export interface TapStatus extends Tap {
  /** Packages trusted one at a time, in a tap that is not trusted as a whole. */
  trustedPackages: string[];
}

/** What a user typed or pasted, reduced to a tap and optionally one package in it. */
export interface TapTarget {
  tap: string;
  /** Fully qualified `user/repo/name`, when the input named a package. */
  package?: string;
  /** Where to clone from, when it is not `github.com/<user>/homebrew-<repo>`. */
  url?: string;
  /** The pasted line said `--cask`: resolve the package as a cask, not a same-named formula. */
  cask?: true;
}

/** The bare package name a target names: `rcc` for `thousandflowers/tap/rcc`. */
export function packageNameOf(target: TapTarget): string | undefined {
  return target.package?.split("/").pop();
}

/** The owner of a `user/repo` tap name. */
export function tapOwner(tapName: string): string {
  return tapName.split("/")[0];
}

/**
 * The target that installs `name` from a tap. Built field by field rather than
 * by spreading `tap`, which would carry a pasted `--cask` onto a formula.
 */
export function installTargetFor(tap: TapTarget, name: string, cask: boolean): TapTarget & { package: string } {
  return {
    tap: tap.tap,
    ...(tap.url ? { url: tap.url } : {}),
    package: `${tap.tap}/${name}`,
    ...(cask ? { cask: true as const } : {}),
  };
}

/**
 * Parse `brew tap-info --json=v1 --installed`, keeping only taps that are
 * actually tapped. Under the JSON API brew still reports homebrew/core and
 * homebrew/cask with `installed: false`; they are not something to untap or
 * explore.
 */
export function parseTapInfo(json: string): Tap[] {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (err) {
    throw new ParseError("Failed to parse brew tap-info output", { cause: err as Error });
  }
  if (!Array.isArray(value)) {
    throw new ParseError("brew tap-info did not return a list");
  }
  return (value as Tap[]).filter((tap) => tap.installed);
}

/** Parse `brew trust --json=v1`. */
export function parseTrust(json: string): TrustedEntries {
  const value = JSON.parse(json) as Partial<TrustedEntries>;
  if (!Array.isArray(value.taps) || !Array.isArray(value.formulae) || !Array.isArray(value.casks)) {
    throw new ParseError("brew trust did not return taps, formulae and casks");
  }
  return { taps: value.taps, formulae: value.formulae, casks: value.casks };
}

/**
 * The tap's packages that are trusted individually. Matched on the fully
 * qualified name, so a same-named package elsewhere never counts.
 */
/** Hosts where `.git` and a trailing slash don't change the repository (`Tap::NORMALIZE_REMOTE_HOSTS`). */
const NORMALIZE_REMOTE_HOSTS = ["codeberg.org", "github.com", "gitlab.com"];

/**
 * A remote as Homebrew compares two (`Tap.normalize_remote`, `tap.rb`): every
 * GitHub form (HTTPS, SSH, `git@github.com:`) becomes `https://github.com/…`,
 * and `.git` or a trailing slash is dropped only on the hosts above. Anywhere
 * else they may name a different repository, so they are kept.
 */
function remoteKey(url: string): string {
  let remote = url
    .trim()
    .toLowerCase()
    .replace(/^(?:[a-z][a-z0-9+.-]*:\/\/(?:[^@/]+@)?github\.com\/|(?:[^@/]+@)?github\.com:)/, "https://github.com/");
  const host = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/]+@)?([^/:]+)/.exec(remote)?.[1];
  if (!host || !NORMALIZE_REMOTE_HOSTS.includes(host)) return remote;
  remote = remote.replace(/\/+$/, "");
  return remote.endsWith(".git") ? remote.slice(0, -4) : remote;
}

/**
 * Whether a trust list names this package of this tap. brew lowercases every
 * entry, and records a package of a custom-remote tap under the remote
 * (`https://github.com/jundot/omlx/omlx`, `trust.rb` `item_trust_name`), so a
 * literal comparison misses both.
 */
function listed(tap: Tap, entries: string[], fullName: string): boolean {
  const name = fullName.toLowerCase();
  if (entries.some((entry) => entry.toLowerCase() === name)) return true;
  if (!tap.remote) return false;
  const item = name.split("/").pop() ?? name;
  const remote = remoteKey(tap.remote);
  return entries.some((entry) => {
    const lower = entry.toLowerCase();
    return lower.endsWith(`/${item}`) && remoteKey(lower.slice(0, -item.length - 1)) === remote;
  });
}

export function individuallyTrusted(tap: Tap, trust: TrustedEntries): string[] {
  return [
    ...tap.formula_names.filter((name) => listed(tap, trust.formulae, name)),
    ...tap.cask_tokens.filter((token) => listed(tap, trust.casks, token)),
  ];
}

// brew's own tap and package naming. Strict on purpose: the result is spliced
// into a shell command line.
const TAP_WORD = /^[a-z0-9][a-z0-9_.-]*$/;
const PACKAGE_WORD = /^[a-z0-9][a-z0-9_.@+-]*$/;
/** An https git remote. Anything else — http, file, ssh — is refused, not guessed at. */
const URL_WORD = /^https:\/\/[a-z0-9.-]+(?:\/[a-z0-9._~-]+)+$/i;

/** `user/repo` or `user/repo/name`, with brew's `homebrew-` repo prefix dropped. */
function parseQualifiedName(word: string): TapTarget | undefined {
  const segments = word.toLowerCase().split("/");
  if (segments.length !== 2 && segments.length !== 3) return undefined;
  const user = segments[0];
  const repo = segments[1].replace(/^homebrew-/, "");
  if (!TAP_WORD.test(user) || !TAP_WORD.test(repo) || user === "homebrew") return undefined;
  const tap = `${user}/${repo}`;
  if (segments.length === 2) return { tap };
  return PACKAGE_WORD.test(segments[2]) ? { tap, package: `${tap}/${segments[2]}` } : undefined;
}

/**
 * An https remote, normalized. A GitHub URL must be the repository root
 * (`/owner/repo`, optional `.git`): a pasted page such as `…/tree/main` is not
 * something git can clone. Other hosts nest repositories in groups, so their
 * paths are left alone.
 */
function normalizeUrl(word: string): string | undefined {
  const url = word.replace(/^(?:www\.)?github\.com\//i, "https://github.com/").replace(/\/+$/, "");
  if (!URL_WORD.test(url)) return undefined;
  if (/^https:\/\/(?:www\.)?github\.com\//i.test(url) && !/^https:\/\/(?:www\.)?github\.com\/[^/]+\/[^/]+$/i.test(url))
    return undefined;
  return url;
}

/** Where `brew tap user/repo` clones from when no URL is given. */
function defaultTapUrl(tap: string): string {
  const [user, repo] = tap.split("/");
  return `https://github.com/${user}/homebrew-${repo}`;
}

/**
 * Read a tap from what someone typed or pasted: `user/repo`, a fully qualified
 * `user/repo/name`, a GitHub URL, or a whole install-page line
 * (`brew install --cask user/repo/name`, `brew tap user/repo <url>`).
 *
 * A URL is kept only when it is not where brew would look anyway. That is the
 * two-argument form's whole purpose: a repo not named `homebrew-<repo>`
 * (jundot/omlx) cannot be tapped by name alone. A bare URL is accepted only
 * from GitHub, where the tap name follows from the path. Official taps are
 * rejected: they are not a trust decision.
 */
export function parseTapName(input: string): TapTarget | undefined {
  const words = input.trim().split(/\s+/).filter(Boolean);
  const urlWord = words.find((word) => /^(?:[a-z][a-z0-9+.-]*:\/\/|(?:www\.)?github\.com\/)/i.test(word));
  const nameWord = words.filter((word) => word !== urlWord && word.includes("/")).pop();

  if (nameWord) {
    const parsed = parseQualifiedName(nameWord);
    const target = parsed?.package && words.includes("--cask") ? { ...parsed, cask: true as const } : parsed;
    if (!target || !urlWord) return target;
    const url = normalizeUrl(urlWord);
    if (!url) return undefined;
    const isDefault = url.replace(/\.git$/i, "").toLowerCase() === defaultTapUrl(target.tap);
    return isDefault ? target : { ...target, url };
  }

  const url = urlWord && normalizeUrl(urlWord);
  const github = url && /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i.exec(url);
  if (!url || !github) return undefined;
  const target = parseQualifiedName(`${github[1]}/${github[2]}`);
  if (!target) return undefined;
  return /^homebrew-/i.test(github[2]) ? target : { ...target, url };
}

export type PackageTrust = "trusted" | "untrusted" | "unsupported";

/**
 * Whether Homebrew will load one package without asking: its whole tap is
 * trusted, or the package is, on the list for its kind. `unsupported` means
 * brew predates trust and there is nothing to decide. A tap not yet tapped is
 * `undefined` here and so untrusted unless the package is listed.
 */
export function packageTrustState(
  tap: Tap | undefined,
  trust: TrustedEntries,
  fullName: string,
  isCask: boolean,
): PackageTrust {
  if (tap && tap.trusted === undefined) return "unsupported";
  if (tap?.trusted) return "trusted";
  const entries = isCask ? trust.casks : trust.formulae;
  const trusted = tap
    ? listed(tap, entries, fullName)
    : entries.some((e) => e.toLowerCase() === fullName.toLowerCase());
  return trusted ? "trusted" : "untrusted";
}

/**
 * Ask brew whether one package from a third-party tap is trusted. `tap-info`
 * answers for a tap that is not tapped too (installed: false), so this works
 * before the tap exists locally.
 */
export async function brewPackageTrust(
  tapName: string,
  fullName: string,
  isCask: boolean,
  /** The tap's `tap-info`, when the caller has just read it. */
  known?: Tap,
): Promise<PackageTrust> {
  const tap = known ?? (await brewFetchTap(tapName));
  if (tap?.trusted !== false) return packageTrustState(tap, { taps: [], formulae: [], casks: [] }, fullName, isCask);
  const trust = parseTrust((await execBrew("trust --json=v1")).stdout);
  return packageTrustState(tap, trust, fullName, isCask);
}

/**
 * Installed taps, with the packages trusted individually in any tap that is
 * not trusted whole. `brew trust` is read only when some tap needs it, which
 * also keeps it from running on a Homebrew that predates it.
 */
export async function brewFetchTaps(cancel?: AbortSignal): Promise<TapStatus[]> {
  const taps = parseTapInfo((await execBrew("tap-info --json=v1 --installed", { signal: cancel })).stdout);
  fetchLogger.log("Fetched taps", { count: taps.length });
  if (!taps.some((tap) => tap.trusted === false)) {
    return taps.map((tap) => ({ ...tap, trustedPackages: [] }));
  }
  const trust = parseTrust((await execBrew("trust --json=v1", { signal: cancel })).stdout);
  return taps.map((tap) => ({ ...tap, trustedPackages: individuallyTrusted(tap, trust) }));
}

/**
 * How a tap's command file is run: `cmd/cu.rb` and `cmd/brew-rmtree.rb` are
 * `brew cu` and `brew rmtree`.
 */
export function tapCommandName(file: string): string {
  const base = (file.split("/").pop() ?? file).replace(/\.(rb|sh)$/, "").replace(/^brew-/, "");
  return `brew ${base}`;
}

/** brew's answer when a name does not resolve: one of the two failures bisection routes around. */
function isUnknownName(err: unknown): boolean {
  const stderr = (err as { stderr?: string })?.stderr ?? "";
  return /No available (formula|cask|formula or cask) with the name/.test(stderr);
}

/**
 * brew's answer for a package in an untrusted tap (`trust.rb`,
 * `raise_untrusted!`). From Homebrew 7.0.14 `brew info` loads nothing from an
 * untrusted tap: loading a formula or cask runs its Ruby, which is what trust
 * guards. Only `install`, `reinstall` and `upgrade` naming the package may.
 */
function isUntrustedLoad(err: unknown): boolean {
  return untrustedLoadTarget(err) !== undefined;
}

/**
 * What brew refused to load, by kind and canonical name: for an alias or an
 * old name, brew resolves the real package before it checks trust, and names
 * that one.
 */
export function untrustedLoadTarget(err: unknown): { kind: "formula" | "cask"; fullName: string } | undefined {
  const stderr = (err as { stderr?: string })?.stderr ?? "";
  const refused = /Refusing to load (formula|cask) (\S+) from untrusted tap/.exec(stderr);
  return refused ? { kind: refused[1] as "formula" | "cask", fullName: refused[2] } : undefined;
}

/**
 * The package a `brew info <name>` read refused, trusted and read again. The
 * second read asks the same way as the first, so brew picks between a formula
 * and a cask as it would anyway. Unflagged, brew loads a tap formula and then
 * the same name as a cask (`cli/named_args.rb`, `load_formula_or_cask`), and
 * refuses whichever is untrusted. A refusal now is of the other kind, which
 * the user did not agree to trust, so the trusted package is read by its kind.
 */
export async function loadRefusedPackage(
  name: string,
  refused: { kind: "formula" | "cask"; fullName: string },
  fetch: (name: string, cask?: boolean) => Promise<Cask | Formula | undefined>,
  trust: (kind: "formula" | "cask", fullName: string) => Promise<void>,
  cask?: boolean,
): Promise<Cask | Formula | undefined> {
  await trust(refused.kind, refused.fullName);
  try {
    return await fetch(name, cask);
  } catch (err) {
    // Only the same tap's other kind: a refusal elsewhere (a migration into
    // another tap) may be what brew would pick, so it stands.
    const tap = refused.fullName.slice(0, refused.fullName.lastIndexOf("/") + 1).toLowerCase();
    if (!untrustedLoadTarget(err)?.fullName.toLowerCase().startsWith(tap)) throw err;
    return fetch(refused.fullName, refused.kind === "cask");
  }
}

/**
 * Whether a qualified name is a formula or a cask in this tap, from
 * `tap-info`'s lists, which brew builds from file names without loading any
 * Ruby, so it works for an untrusted tap. Unflagged, a name in both lists is
 * the formula, as `brew install` resolves it. Undefined when neither list has
 * it, as for an alias or a renamed package: then only brew can say.
 */
export function tapPackageKind(tap: Tap, fullName: string, cask?: boolean): "formula" | "cask" | undefined {
  const name = fullName.toLowerCase();
  const has = (names: string[]) => names.some((candidate) => candidate.toLowerCase() === name);
  if (cask) return has(tap.cask_tokens) ? "cask" : undefined;
  if (has(tap.formula_names)) return "formula";
  return has(tap.cask_tokens) ? "cask" : undefined;
}

async function brewInfo(flag: string, names: string[], cancel?: AbortSignal): Promise<InstallableResults> {
  const { stdout } = await execBrew(`info --json=v2 ${flag} ${names.map(shellQuote).join(" ")}`, {
    signal: cancel,
    env: { HOMEBREW_NO_AUTO_UPDATE: "1" },
  });
  return JSON.parse(stdout) as InstallableResults;
}

type InfoEach = { results: InstallableResults; unavailable: string[]; untrusted: string[] };

/**
 * `brew info` over many names, surviving names that no longer resolve or that
 * brew refuses as untrusted. Either fails the whole batch, so a failed batch
 * is halved until the bad names are isolated: log₂(n) extra calls per bad
 * name, none when all load. Any other failure (a lock, a cancel) is not about
 * a name and throws.
 */
async function brewInfoEach(flag: string, names: string[], cancel?: AbortSignal): Promise<InfoEach> {
  if (names.length === 0) return { results: { formulae: [], casks: [] }, unavailable: [], untrusted: [] };
  try {
    return { results: await brewInfo(flag, names, cancel), unavailable: [], untrusted: [] };
  } catch (err) {
    const untrusted = isUntrustedLoad(err);
    if (!untrusted && !isUnknownName(err)) throw err;
    if (names.length === 1) {
      fetchLogger.warn(untrusted ? "Tap package is not trusted" : "Tap package did not load", { name: names[0] });
      const none = { formulae: [], casks: [] };
      return untrusted
        ? { results: none, unavailable: [], untrusted: names }
        : { results: none, unavailable: names, untrusted: [] };
    }
    const mid = Math.ceil(names.length / 2);
    const [a, b] = await Promise.all([
      brewInfoEach(flag, names.slice(0, mid), cancel),
      brewInfoEach(flag, names.slice(mid), cancel),
    ]);
    return {
      results: {
        formulae: [...a.results.formulae, ...b.results.formulae],
        casks: [...a.results.casks, ...b.results.casks],
      },
      unavailable: [...a.unavailable, ...b.unavailable],
      untrusted: [...a.untrusted, ...b.untrusted],
    };
  }
}

/** Packages brew will not load until they or their tap are trusted, by kind. */
export interface UntrustedPackages {
  formulae: string[];
  casks: string[];
}

/**
 * Full `brew info` records for everything these taps provide, for rendering
 * with the same rows as Search: two calls however many taps, when every name
 * loads. A package brew won't load because neither it nor its tap is trusted
 * is not asked about at all (a tap's `trusted: false`, unless
 * `trustedPackages` lists it); it is returned by name in `untrusted`, and so
 * is any name brew refuses anyway, if the trust read was out of date. Formulae and casks are asked for separately: a tap may ship a formula
 * and a cask under one name (darrylmorley/whatcable does), and without `--cask`
 * brew resolves that name to the formula only. `unavailable` lists the fully
 * qualified names brew could not load, so the view can say so rather than
 * silently showing fewer packages.
 */
export async function brewFetchTapPackages(
  taps: (Tap & { trustedPackages?: string[] })[],
  cancel?: AbortSignal,
): Promise<InstallableResults & { unavailable: string[]; untrusted: UntrustedPackages }> {
  const split = (names: (tap: Tap) => string[]) => {
    const load: string[] = [];
    const skip: string[] = [];
    for (const tap of taps) {
      for (const name of names(tap)) {
        (tap.trusted === false && !tap.trustedPackages?.includes(name) ? skip : load).push(name);
      }
    }
    return { load, skip };
  };
  const formulaNames = split((tap) => tap.formula_names);
  const caskNames = split((tap) => tap.cask_tokens);
  const [formulae, casks] = await Promise.all([
    brewInfoEach("--formula", formulaNames.load, cancel),
    brewInfoEach("--cask", caskNames.load, cancel),
  ]);
  return {
    formulae: formulae.results.formulae,
    casks: casks.results.casks,
    unavailable: [...formulae.unavailable, ...casks.unavailable],
    untrusted: {
      formulae: [...formulaNames.skip, ...formulae.untrusted],
      casks: [...caskNames.skip, ...casks.untrusted],
    },
  };
}

/** One tap's `tap-info` record. brew answers for a tap that is not added, with `installed: false`. */
export async function brewFetchTap(tapName: string, cancel?: AbortSignal): Promise<Tap | undefined> {
  const { stdout } = await execBrew(`tap-info --json=v1 ${shellQuote(tapName)}`, {
    signal: cancel,
    env: { HOMEBREW_NO_AUTO_UPDATE: "1" },
  });
  const [tap] = JSON.parse(stdout) as Tap[];
  return tap;
}

export async function brewIsTapped(tapName: string, cancel?: AbortSignal): Promise<boolean> {
  return (await brewFetchTap(tapName, cancel))?.installed === true;
}

/**
 * The full record for one fully-qualified package, from a tap that is already
 * added — brew refuses to read an untapped one. Unflagged, brew picks the
 * formula when a tap ships both kinds under one name; `cask` true asks for the
 * cask and false for the formula. Pass the kind when it is known: unflagged,
 * brew also tries the other kind, and from 7.0.14 an untrusted same-named
 * package of that kind fails the read. Undefined when the tap has no such package.
 */
export async function brewFetchQualifiedPackage(fullName: string, cask?: boolean): Promise<Cask | Formula | undefined> {
  try {
    const flag = cask === true ? "--cask" : cask === false ? "--formula" : "";
    const { formulae, casks } = await brewInfo(flag, [fullName]);
    return formulae[0] ?? casks[0];
  } catch (err) {
    // brew exits 1 for a name it cannot find; that is the answer, not a failure.
    if (isUnknownName(err)) return undefined;
    throw err;
  }
}

/**
 * A `brew …` command line, as `confirmAndRun` lists and runs it. A bare `brew`
 * is enough: `confirmAndRun` runs through `execBrew`'s raw mode, which puts the
 * configured brew's `bin` first on PATH — and it reads far less alarmingly in
 * the confirmation than `/opt/homebrew/bin/brew`.
 */
export function brewTapCommand(...args: string[]): string {
  return ["brew", ...args].map(shellQuote).join(" ");
}

/** What is installed from one tap, as qualified names, split by kind. */
export interface TapInstalls {
  formulae: string[];
  casks: string[];
}

/**
 * The commands that remove a tap and everything installed from it. Not
 * `untap --force`: that uninstalls first only from Homebrew 6.0.13, and before
 * then it untaps and leaves the packages installed. Casks go first, since a
 * cask can depend on a formula. `confirmAndRun` stops at the first failure, so
 * a package brew refuses to uninstall keeps its tap.
 *
 * Autoremove is off for the uninstalls, as it is inside `untap --force`. Left
 * on, uninstalling the casks removes the tap's formulae that were installed
 * only as their dependencies, and the formula step then fails on a package
 * that is already gone, so the tap is never removed.
 */
export function untapSteps(
  tapName: string,
  installed: TapInstalls,
  opts: { untrust?: boolean } = {},
): { command: string; label: string }[] {
  const steps: { command: string; label: string }[] = [];
  const uninstall = (...args: string[]) => `HOMEBREW_NO_AUTOREMOVE=1 ${brewTapCommand("uninstall", ...args)}`;
  if (installed.casks.length > 0) {
    steps.push({ command: uninstall("--cask", ...installed.casks), label: "Uninstalling casks" });
  }
  if (installed.formulae.length > 0) {
    steps.push({ command: uninstall("--formula", ...installed.formulae), label: "Uninstalling formulae" });
  }
  // brew keeps trust after an untap. Cleared first, while the tap is still
  // added: a custom-remote tap is recorded by URL, resolved through the tap.
  if (opts.untrust) steps.push({ command: brewTapCommand("untrust", "--tap", tapName), label: "Clearing trust" });
  steps.push({ command: brewTapCommand("untap", tapName), label: "Removing the tap" });
  return steps;
}

/** `untapSteps` without the labels. */
export function untapCommands(tapName: string, installed: TapInstalls, opts: { untrust?: boolean } = {}): string[] {
  return untapSteps(tapName, installed, opts).map((step) => step.command);
}
