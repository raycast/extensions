/**
 * Third-party taps: listing them, and the commands that add, remove and trust
 * them.
 *
 * Trust is Homebrew's, not ours. Since Homebrew 7, `brew trust` gates loading
 * any non-official tap's formulae, casks and commands, at three scopes (a whole
 * tap, one formula, one cask), recorded in `~/.homebrew/trust.json`. Reading is
 * not gated — `brew info` returns full records from an untrusted tap — but a
 * fully-qualified install trusts that one package on its own, even under
 * `--dry-run` (verified on 7.0.6).
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
export function individuallyTrusted(tap: Tap, trust: TrustedEntries): string[] {
  return [
    ...tap.formula_names.filter((name) => trust.formulae.includes(name)),
    ...tap.cask_tokens.filter((token) => trust.casks.includes(token)),
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
  return (isCask ? trust.casks : trust.formulae).includes(fullName) ? "trusted" : "untrusted";
}

/**
 * Ask brew whether one package from a third-party tap is trusted. `tap-info`
 * answers for a tap that is not tapped too (installed: false), so this works
 * before the tap exists locally.
 */
export async function brewPackageTrust(tapName: string, fullName: string, isCask: boolean): Promise<PackageTrust> {
  const { stdout } = await execBrew(`tap-info --json=v1 ${shellQuote(tapName)}`, {
    env: { HOMEBREW_NO_AUTO_UPDATE: "1" },
  });
  const [tap] = JSON.parse(stdout) as Tap[];
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

/** brew's answer when a name does not resolve: the one failure bisection can route around. */
function isUnknownName(err: unknown): boolean {
  const stderr = (err as { stderr?: string })?.stderr ?? "";
  return /No available (formula|cask|formula or cask) with the name/.test(stderr);
}

async function brewInfo(flag: string, names: string[], cancel?: AbortSignal): Promise<InstallableResults> {
  const { stdout } = await execBrew(`info --json=v2 ${flag} ${names.map(shellQuote).join(" ")}`, {
    signal: cancel,
    env: { HOMEBREW_NO_AUTO_UPDATE: "1" },
  });
  return JSON.parse(stdout) as InstallableResults;
}

/**
 * `brew info` over many names, surviving names that no longer resolve. One
 * unknown name fails the whole batch, so a failed batch is halved until the
 * bad names are isolated: log₂(n) extra calls per bad name, none when all
 * load. Any other failure (a lock, a cancel) is not about a name and throws.
 */
async function brewInfoEach(
  flag: string,
  names: string[],
  cancel?: AbortSignal,
): Promise<{ results: InstallableResults; unavailable: string[] }> {
  if (names.length === 0) return { results: { formulae: [], casks: [] }, unavailable: [] };
  try {
    return { results: await brewInfo(flag, names, cancel), unavailable: [] };
  } catch (err) {
    if (!isUnknownName(err)) throw err;
    if (names.length === 1) {
      fetchLogger.warn("Tap package did not load", { name: names[0] });
      return { results: { formulae: [], casks: [] }, unavailable: names };
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
    };
  }
}

/**
 * Full `brew info` records for everything these taps provide, for rendering
 * with the same rows as Search: two calls however many taps, when every name
 * loads. Formulae and casks are asked for separately: a tap may ship a formula
 * and a cask under one name (darrylmorley/whatcable does), and without `--cask`
 * brew resolves that name to the formula only. `unavailable` lists the fully
 * qualified names brew could not load, so the view can say so rather than
 * silently showing fewer packages.
 */
export async function brewFetchTapPackages(
  taps: Tap[],
  cancel?: AbortSignal,
): Promise<InstallableResults & { unavailable: string[] }> {
  const [formulae, casks] = await Promise.all([
    brewInfoEach(
      "--formula",
      taps.flatMap((tap) => tap.formula_names),
      cancel,
    ),
    brewInfoEach(
      "--cask",
      taps.flatMap((tap) => tap.cask_tokens),
      cancel,
    ),
  ]);
  return {
    formulae: formulae.results.formulae,
    casks: casks.results.casks,
    unavailable: [...formulae.unavailable, ...casks.unavailable],
  };
}

/** Whether the tap is added on this Mac. `tap-info` answers for one that is not. */
export async function brewIsTapped(tapName: string): Promise<boolean> {
  const { stdout } = await execBrew(`tap-info --json=v1 ${shellQuote(tapName)}`, {
    env: { HOMEBREW_NO_AUTO_UPDATE: "1" },
  });
  const [tap] = JSON.parse(stdout) as Tap[];
  return tap?.installed === true;
}

/**
 * The full record for one fully-qualified package, from a tap that is already
 * added — brew refuses to read an untapped one. Unflagged, brew picks the
 * formula when a tap ships both kinds under one name; `cask` asks for the cask.
 * Undefined when the tap has no such package.
 */
export async function brewFetchQualifiedPackage(fullName: string, cask?: boolean): Promise<Cask | Formula | undefined> {
  try {
    const { formulae, casks } = await brewInfo(cask ? "--cask" : "", [fullName]);
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
export function untapCommands(tapName: string, installed: TapInstalls): string[] {
  const commands: string[] = [];
  const uninstall = (...args: string[]) => `HOMEBREW_NO_AUTOREMOVE=1 ${brewTapCommand("uninstall", ...args)}`;
  if (installed.casks.length > 0) commands.push(uninstall("--cask", ...installed.casks));
  if (installed.formulae.length > 0) commands.push(uninstall("--formula", ...installed.formulae));
  commands.push(brewTapCommand("untap", tapName));
  return commands;
}
