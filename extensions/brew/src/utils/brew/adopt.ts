/**
 * Finding applications already on the Mac that Homebrew could take ownership of.
 *
 * `brew install --adopt --cask <token>` claims an app already sitting at the
 * cask's destination instead of downloading over it. Homebrew verifies the
 * match itself — `cask/artifact/moved.rb:95-125` compares the bundle's
 * `CFBundleShortVersionString`, then `CFBundleVersion`, then falls back to
 * `/usr/bin/diff --recursive --brief` — but it **skips that comparison entirely
 * for a cask declaring `auto_updates`**, which is 42% of the app-bearing
 * catalog. For those, whatever bundle is at the path gets adopted.
 *
 * That is why this module exists. Adoption writes an install receipt, after
 * which `brew upgrade` replaces the app and `brew uninstall` deletes it, so a
 * wrong match is a delayed data-loss bug rather than a cosmetic one. Matching on
 * the app's bundle NAME alone is not good enough: plenty of unrelated apps share
 * a name with a cask — Iris, Crunch, Atlas and Pencil each name-match a cask for
 * entirely different software.
 *
 * So a name match only opens the question, and two further signals answer it —
 * see `identitySignal` and `versionRelationship`. Everything here is pure and
 * has no `@raycast/api` import, so it is exercised directly against captured
 * records in `adopt.test.ts`.
 */

import { execFile } from "child_process";
import { existsSync, statSync } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import type { Cask } from "../types";
import { caskVersionForCompare, compareVersions } from "./version";

const execFileAsync = promisify(execFile);

/// The build-time index

/**
 * What the Adopt scan needs to know about one cask.
 *
 * Keys are one letter because this is written once per app-bearing cask (4,145
 * of them) and read only by this feature: 217 KB as it stands, against 340 KB
 * spelled out.
 */
export interface AdoptIndexEntry {
  /** App bundle names the cask installs, e.g. `["Transmit.app"]`. */
  a: string[];
  /** Bundle ids from the cask's `uninstall`/`zap` `quit:`, where it declares any. */
  q?: string[];
  /** Link sources that resolve INSIDE one of the cask's own app bundles. */
  s?: string[];
}

/** token → entry, for every cask that installs at least one app. */
export type AdoptIndex = Record<string, AdoptIndexEntry>;

/** The filename written beside the cask chunks. */
export const ADOPT_INDEX_FILE = "adopt-index.json";

/**
 * Artifact stanzas that subclass `Symlinked` — the ones whose source path can
 * point inside an app bundle. Kept in step with `CASK_SYMLINK_STANZAS` in
 * `link.ts`, which governs link/unlink; the two happen to be the same list for
 * the same reason, but they answer different questions and are read separately.
 */
const LINKED_STANZAS = [
  "binary",
  "manpage",
  "bash_completion",
  "zsh_completion",
  "fish_completion",
  "pwsh_completion",
] as const;

/**
 * Where `<name>/` begins a path COMPONENT in `source`, or -1.
 *
 * A bare substring search would find `Foo.app/` inside `MyFoo.app/Contents/x`,
 * attribute that file to the wrong bundle, and then either block a valid
 * adoption or check the wrong path. None in today's catalog, which is exactly
 * when a matcher is cheapest to get right.
 */
function bundleComponentIndex(source: string, bundleName: string): number {
  const marker = `${bundleName}/`;
  let at = source.indexOf(marker);
  while (at !== -1) {
    if (at === 0 || source[at - 1] === "/") return at;
    at = source.indexOf(marker, at + 1);
  }
  return -1;
}

/**
 * Bundle names an `app` stanza would place **at the destination**.
 *
 * `app "Thorium.app", target: "Thorium Browser.app"` publishes as
 * `{"app": ["Thorium.app", {"target": "Thorium Browser.app"}], "target": "/Applications/Thorium Browser.app"}`
 * — the array holds the name inside the downloaded archive AND the rename.
 * Homebrew installs, and therefore adopts, at the target, so only the target is
 * an adoptable name. Indexing the source as well invents a candidate at a path
 * Homebrew never writes, and any app that genuinely carries the source name
 * gets matched to the wrong cask. 60 casks in the catalog rename this way,
 * `appflowy` (`AppFlowy-arm64.app` → `AppFlowy.app`) and
 * `android-studio-preview@beta` among them.
 */
function appBundleNames(cask: Pick<Cask, "artifacts">): string[] {
  const names = new Set<string>();
  for (const artifact of cask.artifacts ?? []) {
    const entries = artifact.app;
    if (!Array.isArray(entries)) continue;
    // A rename anywhere in the stanza — as an entry, or as the artifact's own
    // absolute `target` — replaces every source name it accompanies.
    const renames = entries.filter(isRename).map((entry) => entry.target);
    if (typeof artifact.target === "string") renames.push(artifact.target);
    if (renames.length > 0) {
      for (const target of renames) names.add(path.basename(target));
      continue;
    }
    for (const entry of entries) {
      if (typeof entry === "string") names.add(path.basename(entry));
    }
  }
  return [...names];
}

function isRename(value: unknown): value is { target: string } {
  return typeof value === "object" && value !== null && typeof (value as { target?: unknown }).target === "string";
}

/** Bundle ids the cask names in a `quit:` — the only identity it publishes. */
function quitBundleIds(cask: Pick<Cask, "artifacts">): string[] {
  const ids = new Set<string>();
  for (const artifact of cask.artifacts ?? []) {
    for (const key of ["uninstall", "zap"] as const) {
      const stanza = artifact[key];
      // Both stanzas are documented as a single hash, but a list is accepted
      // and appears in the published JSON, so read either.
      for (const entry of Array.isArray(stanza) ? stanza : stanza ? [stanza] : []) {
        if (typeof entry !== "object" || entry === null) continue;
        const quit = (entry as { quit?: unknown }).quit;
        for (const id of typeof quit === "string" ? [quit] : Array.isArray(quit) ? quit : []) {
          if (typeof id === "string") ids.add(id);
        }
      }
    }
  }
  return [...ids];
}

/**
 * Link sources that live inside one of this cask's own app bundles.
 *
 * These are the paths `adoptionBlockers` checks for. A source pointing anywhere
 * else — into the staging area, or at a file the cask ships separately — is not
 * this check's business, because it is not something the user's existing copy
 * could be missing.
 */
function inBundleLinkSources(cask: Pick<Cask, "artifacts">, appNames: readonly string[]): string[] {
  const sources = new Set<string>();
  for (const artifact of cask.artifacts ?? []) {
    for (const stanza of LINKED_STANZAS) {
      const entries = artifact[stanza];
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (typeof entry !== "string") continue;
        if (appNames.some((name) => bundleComponentIndex(entry, name) !== -1)) sources.add(entry);
      }
    }
  }
  return [...sources];
}

/**
 * The index entry for one cask, or `undefined` when it installs no app.
 *
 * Called once per record while the chunked cask cache is built, from the same
 * streaming pass that reduces `artifacts` — this is the only point where the
 * arrays still exist, since the cache deliberately does not store them (see
 * `valid_keys` in `../cache.ts`).
 */
export function adoptIndexEntry(cask: Pick<Cask, "artifacts">): AdoptIndexEntry | undefined {
  const a = appBundleNames(cask);
  if (a.length === 0) return undefined;
  const entry: AdoptIndexEntry = { a };
  const q = quitBundleIds(cask);
  if (q.length > 0) entry.q = q;
  const s = inBundleLinkSources(cask, a);
  if (s.length > 0) entry.s = s;
  return entry;
}

/// Scan-time signals

/** Whether the cask's published identity agrees with the installed bundle. */
export type IdentitySignal = "confirms" | "contradicts" | "silent";

/**
 * Compare the installed app's bundle id against the ids the cask publishes.
 *
 * **A tiebreaker, never a gate.** It has false negatives: Kaleidoscope 7.0.1
 * still carries the legacy identifier `app.kaleidoscope.v4` while the
 * `kaleidoscope` cask's `quit:` reads `app.kaleidoscope.v7`, so treating a
 * mismatch as fatal would reject a correct match. It earns its place on
 * ambiguity — four casks claim `Telegram.app`, and the installed
 * `com.tdesktop.Telegram` picks `telegram-desktop` out of them.
 *
 * 78% of app-bearing casks publish no id at all, hence `silent`, which must
 * read as "no information" and never as "no match".
 */
export function identitySignal(bundleId: string | undefined, quitIds: readonly string[] | undefined): IdentitySignal {
  if (!bundleId || !quitIds || quitIds.length === 0) return "silent";
  return quitIds.includes(bundleId) ? "confirms" : "contradicts";
}

/** How the cask's version relates to the version already installed. */
export type VersionRelationship = "same" | "brew-newer" | "brew-older" | "unknown";

/**
 * Order the installed bundle's version against the cask's.
 *
 * This is the signal that best separates a real candidate from a name
 * collision: a true match usually reads `same`, and a false positive usually
 * shows versions that cannot be the same software (Pencil 1.1.0 against the
 * `pencil` cask's 3.1.1).
 *
 * `compareVersions` refuses any shape it cannot order and that refusal stands —
 * `unknown` is an honest answer and callers must not read it as "different".
 */
export function versionRelationship(
  installed: string | undefined,
  caskVersion: string | undefined,
): VersionRelationship {
  if (!installed || !caskVersion) return "unknown";
  const order = compareVersions(installed, caskVersionForCompare(caskVersion));
  if (order === undefined) return "unknown";
  if (order === 0) return "same";
  return order < 0 ? "brew-newer" : "brew-older";
}

/**
 * The section a candidate is listed under.
 *
 * `verified` does not mean "will succeed" — it means SOMEONE independent of the
 * app's name checks the identity:
 *
 * - the cask publishes a bundle id and it matches the installed app, or
 * - the cask is not `auto_updates`, so Homebrew runs its own comparison during
 *   adoption (`cask/artifact/moved.rb:95-125`) and refuses a mismatch.
 *
 * `likely` is the case where neither holds but the name AND the version agree:
 * an `auto_updates` cask that publishes no matching id, at the same version as
 * the installed app. Homebrew will not look, so it is listed as what it is and
 * adoption from it goes through the preview. CodeEdit is the typical case.
 *
 * `mismatched` is everything else — the versions disagree, or cannot be
 * ordered while nothing else vouches for the match. An unorderable version is
 * missing evidence, never agreement: a genuine match that publishes no
 * readable version (Keka) has exactly the evidence of an unrelated app whose
 * version will not parse, and nothing tells those apart — so both get the same
 * caution. They are still one preview away.
 */
export type AdoptTier = "verified" | "likely" | "mismatched";

/** `contradicted` is not a tier — it is the signal to drop the candidate. */
export type AdoptClassification = AdoptTier | "contradicted";

/**
 * Classify one (app, cask) pair.
 *
 * Order matters. A version that disagrees is `mismatched` before anything else,
 * because plain `--adopt` cannot be what happens next whatever the identity
 * says. Only then does the question become who vouches for the match.
 */
export function adoptClassification(
  identity: IdentitySignal,
  relationship: VersionRelationship,
  autoUpdates: boolean,
): AdoptClassification {
  // A contradicting id is only fatal alongside a version that also disagrees —
  // on its own it has known false negatives (Kaleidoscope's legacy identifier).
  if (identity === "contradicts" && relationship !== "same") return "contradicted";
  // For an auto_updates cask the app running ahead of the cask is the NORMAL
  // state — it updated itself — and Homebrew skips its version comparison, so a
  // version gap says nothing about identity there. A confirmed id is decisive —
  // e.g. Fantastical 4.2.1 installed against a 4.2 cask, `quit:` id matching.
  if (autoUpdates && identity === "confirms") return "verified";
  if (relationship === "brew-newer" || relationship === "brew-older") return "mismatched";
  if (identity === "confirms" || !autoUpdates) return "verified";
  // Nobody checks this one, so "likely" has to mean the name AND the version
  // agree. A version that cannot be ordered is missing evidence, not agreement,
  // and must not promote a candidate: otherwise an unrelated app (Atlas, which
  // is not `atlas-app`) moves from Unlikely to Likely the moment its version
  // becomes unparseable, as `1.6.13b` is.
  return relationship === "same" ? "likely" : "mismatched";
}

/**
 * What adopting would actually do.
 *
 * Only `adopt` is offered by this command. The replacement operations need
 * `brew install --force`, which overwrites the user's copy with Homebrew's —
 * a destructive action that belongs behind its own confirmation, not behind a
 * row labeled Adopt. (`--adopt` and `--force` are mutually exclusive anyway:
 * `cmd/install.rb:173`.)
 */
export type AdoptOperation = "adopt" | "update-and-adopt" | "downgrade-and-adopt";

export function adoptOperation(relationship: VersionRelationship): AdoptOperation {
  switch (relationship) {
    case "same":
    case "unknown":
      return "adopt";
    case "brew-newer":
      return "update-and-adopt";
    case "brew-older":
      return "downgrade-and-adopt";
  }
}

/// Preflight

/** Why a candidate cannot be adopted as it stands. */
export type AdoptBlocker = { kind: "missing-component"; component: string } | { kind: "cask-conflict"; token: string };

/**
 * Link sources the installed bundle would have to contain for `--adopt` to
 * survive, expressed as paths relative to the bundle.
 *
 * The caller checks whether they exist; this only says which to check, so the
 * rule stays testable without a filesystem.
 *
 * Why it matters: when a declared link source is missing from the bundle,
 * Homebrew fails **after** it has already moved the app aside, and its rollback
 * can then remove the only copy. Real case: `kaleidoscope@2` declares
 * `ksdiff`, which Kaleidoscope 7 does not contain.
 */
export function bundleRelativeLinkSources(entry: AdoptIndexEntry, appBundleName: string): string[] {
  const relative: string[] = [];
  for (const source of entry.s ?? []) {
    const at = bundleComponentIndex(source, appBundleName);
    if (at === -1) continue;
    relative.push(source.slice(at + appBundleName.length + 1));
  }
  return relative;
}

/**
 * Casks that conflict with this one AND are already installed.
 *
 * Homebrew refuses the install rather than warning, so this is reported before
 * anything runs rather than surfaced as a command failure afterwards.
 */
export function conflictingInstalledCasks(
  cask: Pick<Cask, "conflicts_with">,
  installed: ReadonlySet<string>,
): string[] {
  return (cask.conflicts_with?.cask ?? []).filter((token) => installed.has(token)).sort();
}

/// Probing the installed bundle

/**
 * The directory Homebrew will adopt INTO when this extension runs it.
 *
 * `brew` is spawned with Raycast's own environment (`execBrewEnv` copies
 * `process.env`), not the user's shell, so its `--appdir` is whatever
 * `HOMEBREW_CASK_OPTS` says there — and `/Applications`, Homebrew's default,
 * when that is unset, as it usually is.
 *
 * It has to be exactly that one directory. `brew install --adopt` targets
 * `<appdir>/<Name>.app` and nothing else, so an app matched anywhere else is
 * evidence about the wrong file: if a user has `~/Applications/Foo.app` and
 * appdir is `/Applications`, adoption either installs a fresh copy beside it
 * (nothing at the target to adopt) or, worse, adopts a different
 * `/Applications/Foo.app` that the preview never looked at.
 *
 * It is also the guard against system apps. macOS ships `Recents.app` INSIDE
 * `Finder.app` and `Console.app` under `/System/Applications/Utilities`; both
 * name-match a cask, and `recents` is not `auto_updates`, so without this the
 * list offered an SIP-protected Apple binary labeled as verified.
 *
 * Known false negative, accepted: four `box-tools` apps target
 * `~/Library/Application Support/Box/Box Edit/` explicitly. Honoring per-cask
 * targets would mean indexing absolute destinations; not worth it for one cask.
 */
export function caskAppdir(env: NodeJS.ProcessEnv = process.env): string {
  // Homebrew's own reading, step for step (`env_config.rb` `cask_opts`,
  // `cask/config.rb` `env` + `canonicalize`): shell-split the variable, keep
  // every word containing `=`, strip a leading `--`, build a hash — so the LAST
  // `appdir` wins — and expand the path. Only the `=` form counts: Homebrew
  // ignores `--appdir /x`, so honoring it would scan a directory brew never
  // adopts into. A regex taking the first match got duplicates, quoting and
  // escaping wrong, each a way to scan one directory while brew uses another.
  let appdir = "/Applications";
  const words = shellSplit(env.HOMEBREW_CASK_OPTS ?? "");
  // An unmatched quote makes Homebrew itself raise, so no install would run.
  if (words === undefined) return appdir;
  for (const word of words) {
    const eq = word.indexOf("=");
    if (eq === -1) continue;
    if (word.slice(0, eq).replace(/^--/, "") === "appdir") appdir = word.slice(eq + 1);
  }
  return expandPath(appdir);
}

/**
 * Ruby's `Shellwords.shellsplit`, which is what Homebrew runs on
 * `HOMEBREW_CASK_OPTS`. Undefined where Ruby raises (an unmatched quote).
 *
 * Ported from the stdlib rather than approximated, because every place the two
 * disagree is a place the scan and the adoption use different directories.
 */
export function shellSplit(line: string): string[] | undefined {
  const words: string[] = [];
  let field = "";
  // Same alternation as Ruby's, in the same order: bare word, single-quoted,
  // double-quoted, backslash escape, garbage (an unmatched quote).
  //
  // Ruby ends this with `(\s|\z)?`; JavaScript cannot. A quantified group that
  // matches only the empty string is REJECTED by the spec (its guard against
  // infinite loops), so at end of input `($)?` reads as unmatched and the last
  // field is silently dropped — which dropped the `--appdir` in every one-word
  // value. End of input is checked separately instead.
  const token = /\s*(?:([^\s\\'"]+)|'([^']*)'|"((?:[^"\\]|\\.)*)"|(\\.?)|(\S))(\s)?/y;
  let match: RegExpExecArray | null;
  while (token.lastIndex < line.length && (match = token.exec(line)) !== null) {
    const [whole, word, single, double, escape, garbage, separator] = match;
    if (garbage !== undefined) return undefined;
    if (word !== undefined) field += word;
    else if (single !== undefined) field += single;
    // Inside double quotes a backslash escapes only $ ` " \ and newline.
    else if (double !== undefined) field += double.replace(/\\([$`"\\\n])/g, "$1");
    else if (escape !== undefined) field += escape.replace(/\\(.)/gs, "$1");
    if (separator !== undefined || token.lastIndex >= line.length) {
      words.push(field);
      field = "";
    }
    // Trailing whitespace alone matches nothing and would loop forever.
    if (whole.length === 0) break;
  }
  return words;
}

/** `Pathname#expand_path` for the cases a path setting takes: `~`, `~/…`, relative. */
function expandPath(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return path.resolve(value);
}

/** Whether an app sits exactly where Homebrew would adopt it. */
export function isAdoptableLocation(appPath: string, appdir: string = caskAppdir()): boolean {
  return path.dirname(path.resolve(appPath)) === appdir;
}

/**
 * Whether the app came from the Mac App Store.
 *
 * A receipt-bound app is never adoptable: Homebrew cannot manage it and the App
 * Store keeps updating it underneath. Both of the Mac App Store apps on this
 * machine that name-match a cask — Craft and Draw Things — would otherwise have
 * been offered, and Draw Things would have passed the bundle-id check as well,
 * so nothing else in this module catches them.
 */
export function isMacAppStoreApp(appPath: string): boolean {
  return existsSync(path.join(appPath, "Contents", "_MASReceipt", "receipt"));
}

/**
 * Whether the current user owns the app bundle, or undefined if it cannot be read.
 *
 * An app that installs itself through a privileged helper — ChatGPT Classic is
 * one — is `root:admin`, and adopting it makes brew prompt for a password,
 * which takes focus from Raycast. Knowing in advance lets the command say so.
 */
export function isOwnedByCurrentUser(appPath: string): boolean | undefined {
  try {
    const uid = process.getuid?.();
    return uid === undefined ? undefined : statSync(appPath).uid === uid;
  } catch {
    return undefined;
  }
}

/**
 * `CFBundleShortVersionString`, falling back to `CFBundleVersion` — the same two
 * keys, in the same order, that Homebrew's own adoption check reads
 * (`cask/artifact/moved.rb:95-125`).
 *
 * An `Info.plist` is usually a binary plist, which Node cannot parse, so this
 * shells out to `plutil`. It runs only for apps that already name-matched a
 * cask — a handful — never for every app on the disk.
 *
 * Returns `undefined` rather than throwing: an unreadable plist means the
 * version is unknown, which the verdict already handles as its own case.
 */
export async function readBundleVersion(appPath: string): Promise<string | undefined> {
  const plist = path.join(appPath, "Contents", "Info.plist");
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", ["-convert", "json", "-o", "-", plist]);
    const parsed: unknown = JSON.parse(stdout);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const info = parsed as Record<string, unknown>;
    for (const key of ["CFBundleShortVersionString", "CFBundleVersion"]) {
      const value = info[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Declared link sources the installed bundle does NOT contain.
 *
 * Each one is a reason to refuse: Homebrew fails on a missing source **after**
 * moving the app aside, and its rollback can remove the only copy.
 */
export async function missingLinkedComponents(
  appPath: string,
  entry: AdoptIndexEntry,
  appBundleName: string,
): Promise<string[]> {
  const missing: string[] = [];
  for (const relative of bundleRelativeLinkSources(entry, appBundleName)) {
    if (!existsSync(path.join(appPath, relative))) missing.push(path.basename(relative));
  }
  return missing;
}

/// The scan

/** The shape `getApplications()` gives us, narrowed to what matching needs. */
export interface InstalledApplication {
  name: string;
  path: string;
  bundleId?: string;
}

/** One cask that claims an installed app, with the evidence for and against. */
export interface AdoptCandidate {
  token: string;
  caskVersion?: string;
  /** From the cask — `true` means Homebrew will NOT verify the match itself. */
  autoUpdates: boolean;
  identity: IdentitySignal;
  relationship: VersionRelationship;
  tier: AdoptTier;
  operation: AdoptOperation;
  /** Declared link sources absent from the installed bundle. Non-empty blocks adoption. */
  missingComponents: string[];
  /** Conflicting casks that are already installed. Non-empty blocks adoption. */
  conflicts: string[];
}

/** An installed app with every cask that might adopt it, best candidate first. */
export interface AdoptableApp {
  /** Display name without the extension, e.g. `Transmit`. */
  name: string;
  /** Bundle name as it appears on disk, e.g. `Transmit.app` — the matching key. */
  bundleName: string;
  path: string;
  bundleId?: string;
  version?: string;
  candidates: AdoptCandidate[];
  /**
   * False when the bundle is not owned by the current user — typically `root`,
   * from an app that installed itself through a privileged helper. Homebrew
   * then needs `sudo` to adopt it and will ask for an administrator password,
   * which the command says before it happens. Undefined when unreadable.
   */
  ownedByUser?: boolean;
  /**
   * The user dismissed this app. It is still scanned and returned, so the
   * command can offer a way back — ignoring is one keystroke, and a one-way
   * door would make a misfire permanent.
   */
  ignored: boolean;
}

const TIER_RANK: Record<AdoptTier, number> = { verified: 0, likely: 1, mismatched: 2 };
/** Within a tier, a version that matches is stronger evidence than one that will not parse. */
const RELATIONSHIP_RANK: Record<VersionRelationship, number> = {
  same: 0,
  unknown: 1,
  "brew-newer": 2,
  "brew-older": 2,
};
const IDENTITY_RANK: Record<IdentitySignal, number> = { confirms: 0, silent: 1, contradicts: 2 };

/**
 * Order candidates for one app so the row can name a default without choosing
 * silently: strongest verdict first, then the one whose identity actually
 * confirms, then alphabetically so the order never depends on catalog order.
 *
 * This is what picks `telegram-desktop` out of the four casks claiming
 * `Telegram.app` — all four are version-mismatched against the installed 6.5.1,
 * and only that one's `quit:` matches `com.tdesktop.Telegram`.
 */
function byStrength(a: AdoptCandidate, b: AdoptCandidate): number {
  return (
    TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
    RELATIONSHIP_RANK[a.relationship] - RELATIONSHIP_RANK[b.relationship] ||
    IDENTITY_RANK[a.identity] - IDENTITY_RANK[b.identity] ||
    a.token.localeCompare(b.token)
  );
}

export interface AdoptScanInput {
  /** Every application LaunchServices knows about. */
  apps: readonly InstalledApplication[];
  /** The derived index written beside the cask chunks. */
  index: AdoptIndex;
  /** Tokens Homebrew already owns — those apps are not candidates. */
  installedCasks: ReadonlySet<string>;
  /** Bundle ids the user has dismissed. Marked, not dropped — see `ignored`. */
  ignoredBundleIds: ReadonlySet<string>;
  /** Loads full cask records for the handful of matched tokens. */
  loadCasks: (tokens: string[]) => Promise<Cask[]>;
  /** Where brew will adopt into; defaults to `caskAppdir()`. Injectable for tests. */
  appdir?: string;
}

/**
 * Applications Homebrew could take over, with the evidence for each.
 *
 * The order of the filters is the point. Name matching is the widest and
 * cheapest step but on its own it is unreliable, so it runs first only to
 * narrow hundreds of apps to a handful; every expensive or authoritative check
 * then runs on that short list. Nothing reads an `Info.plist` or shells out for
 * an app that did not match a cask name.
 *
 * A candidate whose verdict is `contradicted` is dropped here rather than
 * rendered and hidden, so no caller can accidentally offer it.
 */
export async function scanForAdoptableApps(input: AdoptScanInput): Promise<AdoptableApp[]> {
  const { apps, index, installedCasks, ignoredBundleIds, loadCasks } = input;
  const appdir = input.appdir ?? caskAppdir();

  // Name → tokens, inverted from the index once rather than per app.
  const byBundleName = new Map<string, string[]>();
  // Bundle names Homebrew ALREADY places. Skipping merely the installed token is
  // not enough: a managed app comes straight back as a candidate for its own
  // `@beta` sibling, which claims the same bundle name — Slack installed via
  // `slack` would be offered to `slack@beta`.
  const managedBundleNames = new Set<string>();
  for (const [token, entry] of Object.entries(index)) {
    if (installedCasks.has(token)) {
      for (const name of entry.a) managedBundleNames.add(name);
      continue;
    }
    for (const name of entry.a) {
      const tokens = byBundleName.get(name);
      if (tokens) tokens.push(token);
      else byBundleName.set(name, [token]);
    }
  }

  const matched: { app: InstalledApplication; bundleName: string; tokens: string[] }[] = [];
  for (const app of apps) {
    // Cheapest first: a path test before any name lookup or disk read.
    if (!isAdoptableLocation(app.path, appdir)) continue;
    const bundleName = path.basename(app.path);
    if (managedBundleNames.has(bundleName)) continue;
    const tokens = byBundleName.get(bundleName);
    if (!tokens || tokens.length === 0) continue;
    // Only now is it worth touching the disk.
    if (isMacAppStoreApp(app.path)) continue;
    matched.push({ app, bundleName, tokens });
  }
  if (matched.length === 0) return [];

  const casks = await loadCasks([...new Set(matched.flatMap((m) => m.tokens))]);
  const byToken = new Map(casks.map((cask) => [cask.token, cask]));

  const results: AdoptableApp[] = [];
  for (const { app, bundleName, tokens } of matched) {
    const version = await readBundleVersion(app.path);
    const candidates: AdoptCandidate[] = [];

    for (const token of tokens) {
      const cask = byToken.get(token);
      // A token in the index with no record in the chunks means the two are out
      // of step. Skip it rather than guess at the cask's version.
      if (!cask) continue;
      const entry = index[token];
      const identity = identitySignal(app.bundleId, entry.q);
      const relationship = versionRelationship(version, cask.version);
      const autoUpdates = Boolean(cask.auto_updates);
      const classification = adoptClassification(identity, relationship, autoUpdates);
      if (classification === "contradicted") continue;

      candidates.push({
        token,
        caskVersion: cask.version,
        autoUpdates,
        identity,
        relationship,
        tier: classification,
        operation: adoptOperation(relationship),
        missingComponents: await missingLinkedComponents(app.path, entry, bundleName),
        conflicts: conflictingInstalledCasks(cask, installedCasks),
      });
    }

    if (candidates.length === 0) continue;
    candidates.sort(byStrength);
    results.push({
      ownedByUser: isOwnedByCurrentUser(app.path),
      name: app.name,
      bundleName,
      path: app.path,
      bundleId: app.bundleId,
      version,
      candidates,
      ignored: Boolean(app.bundleId && ignoredBundleIds.has(app.bundleId)),
    });
  }

  results.sort(
    (a, b) => TIER_RANK[a.candidates[0].tier] - TIER_RANK[b.candidates[0].tier] || a.name.localeCompare(b.name),
  );
  return results;
}

/// Progress

/**
 * The toast line while an adoption runs: brew's current phase and the elapsed
 * time, e.g. `Installing Cask diffusionbee · 0:18`.
 *
 * No percentage, because there is none to be had. Without a terminal brew
 * prints no progress bar, and most of an adoption is not a download at all:
 * even with the DMG already cached, a large app spends its time being mounted,
 * staged and compared, all silently. What brew does print is a few phase
 * lines, so the phase and a clock that visibly moves are the honest signal —
 * half a minute of silence reads as a hang.
 */
export function adoptProgressText(phase: string, elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return `${shortPhase(phase)} · ${clock}`;
}

/**
 * Whether a line brew printed is worth showing as the current phase.
 *
 * `==> Would install 1 cask:` is the plan header brew prints before a REAL
 * install too; shown in a toast mid-adoption it reads as if nothing is being
 * done for real.
 */
export function isAdoptPhase(line: string): boolean {
  return !/^Would (install|upgrade|adopt)\b/.test(line.trim());
}

/** Brew's phase line without the parts that only lengthen a toast. */
function shortPhase(phase: string): string {
  return phase
    .replace(/ at '[^']*'$/, "") // "Adopting existing App at '/Applications/…'"
    .replace(/ from [\w/-]+$/, "") // "Fetching diffusionbee from homebrew/cask"
    .trim();
}
