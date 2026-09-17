import {
  lstatSync,
  readFileSync,
  readlinkSync,
  renameSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  ChooserMode,
  countRules,
  Entry,
  parseEntry,
  parseRuleLine,
  renderEntry,
  renderRuleLine,
  Rule,
  upsertRuleLine,
} from "./entry";

/** The path Finicky looks at first. Patched: a symlink to ENTRY. */
const FINICKY_JS = join(homedir(), ".finicky.js");
/** Where the user's own config goes when it used to be FINICKY_JS. */
const USER_CONFIG = join(homedir(), ".finicky.user.js");
/** The generated entry config: imports the user's config and the glue, holds the mode and the rules. */
const ENTRY = join(homedir(), ".finickizer.js");

/** Finicky's own config search order (apps/finicky/src/config/configfiles.go). */
const FINICKY_CONFIG_CANDIDATES = [
  ".finicky.js",
  ".finicky.ts",
  ".config/finicky.js",
  ".config/finicky.ts",
  ".config/finicky/finicky.js",
  ".config/finicky/finicky.ts",
].map((candidate) => join(homedir(), candidate));

export type Status = { patched: boolean; mode: ChooserMode | null; rules: number; originalPath: string | null };

export type Outcome = { changes: string[]; restartFinicky: boolean };

export function isPatched(): boolean {
  return linkTarget(FINICKY_JS) === ENTRY;
}

export function status(): Status {
  const patched = isPatched();
  let entry: Entry | null = null;
  try {
    entry = readEntry();
  } catch {
    // No entry yet, or not parsable.
  }
  // An entry kept by an earlier unpatch still names ~/.finicky.user.js; unpatched, the truth is on disk.
  return {
    patched,
    mode: patched ? (entry?.mode ?? null) : null,
    rules: entry ? countRules(entry.ruleLines) : 0,
    originalPath: patched ? (entry?.originalPath ?? null) : findOriginal(),
  };
}

/**
 * Makes Finicky load ~/.finickizer.js: generates it, moves the user's ~/.finicky.js (file or symlink,
 * untouched) to ~/.finicky.user.js, and links ~/.finicky.js to the generated file. A config found at one
 * of Finicky's lower-priority paths stays where it is, since the new ~/.finicky.js outranks it.
 * When already patched, only regenerates the entry with the given mode and glue path.
 */
export function patchFinicky(gluePath: string, mode: ChooserMode): Outcome {
  if (isPatched()) {
    const entry = readEntry();
    const changes: string[] = [];
    if (entry.mode !== mode)
      changes.push(mode === "fn" ? "chooser only while fn is held" : "chooser for every unmatched link");
    if (entry.gluePath !== gluePath) changes.push("updated the glue path");
    writeEntry({ ...entry, gluePath, mode });
    return { changes, restartFinicky: false };
  }

  const found = findOriginal();
  if (!found) throw new Error("No Finicky config found (~/.finicky.js)");
  const moves = found === FINICKY_JS;
  if (moves && exists(USER_CONFIG)) throw new Error(`${USER_CONFIG} already exists; move it out of the way first`);

  // Rules survive an unpatch that kept ~/.finickizer.js.
  let ruleLines: string[] = [];
  try {
    ruleLines = readEntry().ruleLines;
  } catch {
    // No previous entry, or not parsable: start without rules.
  }

  const changes: string[] = [];
  writeEntry({ originalPath: moves ? USER_CONFIG : found, gluePath, mode, ruleLines });
  if (moves) {
    renameSync(FINICKY_JS, USER_CONFIG);
    changes.push("moved ~/.finicky.js to ~/.finicky.user.js");
  }
  try {
    symlinkSync(ENTRY, FINICKY_JS);
  } catch (error) {
    // Never leave the user without a ~/.finicky.js.
    if (moves) renameSync(USER_CONFIG, FINICKY_JS);
    throw error;
  }
  changes.push("linked ~/.finicky.js to ~/.finickizer.js");
  return { changes, restartFinicky: true };
}

/** Puts everything back. ~/.finickizer.js is kept for a later patch unless `deleteEntry` is set. */
export function unpatchFinicky({ deleteEntry }: { deleteEntry: boolean }): Outcome {
  if (!isPatched()) throw new Error("The Finicky config is not patched");
  const changes: string[] = [];
  unlinkSync(FINICKY_JS);
  if (exists(USER_CONFIG)) {
    renameSync(USER_CONFIG, FINICKY_JS);
    changes.push("moved ~/.finicky.user.js back to ~/.finicky.js");
  } else {
    changes.push("removed the ~/.finicky.js link");
  }
  if (deleteEntry && exists(ENTRY)) {
    unlinkSync(ENTRY);
    changes.push("deleted ~/.finickizer.js");
  }
  return { changes, restartFinicky: true };
}

/** Saves a remembered rule. Writing the entry is what makes Finicky reload. */
export function upsertRule(rule: Rule): void {
  if (!isPatched()) throw new Error('Run "Patch Finicky Config" first');
  const entry = readEntry();
  writeEntry({ ...entry, ruleLines: upsertRuleLine(entry.ruleLines, rule) });
}

/** A line of the rules block. `rule` is null for a line Finickizer does not recognise. */
export type RuleEntry = { index: number; line: string; rule: Rule | null };

/** The non-blank lines of the rules block, in the order Finicky applies them. */
export function listRules(): RuleEntry[] {
  return readEntry()
    .ruleLines.map((line, index) => ({ index, line, rule: parseRuleLine(line) }))
    .filter((entry) => entry.line.trim() !== "");
}

export function deleteRule(target: RuleEntry): void {
  editRules(target, (lines) => lines.filter((_, index) => index !== target.index));
}

export function setRuleBrowser(target: RuleEntry, browser: string): void {
  if (!target.rule) throw new Error("This line is not a rule Finickizer wrote");
  const line = renderRuleLine({ match: target.rule.match, browser });
  editRules(target, (lines) => lines.map((existing, index) => (index === target.index ? line : existing)));
}

/** Swaps the rule with its neighbour; `delta` is -1 for up, 1 for down. Does nothing at either end. */
export function moveRule(target: RuleEntry, delta: -1 | 1): void {
  editRules(target, (lines) => {
    const to = target.index + delta;
    if (to < 0 || to >= lines.length) return lines;
    const next = [...lines];
    [next[target.index], next[to]] = [next[to], next[target.index]];
    return next;
  });
}

/** Applies a change to the rule lines after checking the target is still where the caller saw it. */
function editRules(target: RuleEntry, change: (lines: string[]) => string[]): void {
  const entry = readEntry();
  if (entry.ruleLines[target.index] !== target.line) throw new Error("The rules changed in the meantime; try again");
  writeEntry({ ...entry, ruleLines: change(entry.ruleLines) });
}

/**
 * Makes Finicky rebundle by rewriting the entry with its own bytes: Finicky watches only that file
 * and ignores mtime-only touches. With `onlyIfStale`, does nothing unless the user's config or the glue
 * is newer than the entry.
 * Also repairs the glue import when the extension's folder has moved (an update or reinstall), since
 * a dead import would stop Finicky from loading any config at all. Returns whether it rewrote the file.
 */
export function reloadFinicky({ onlyIfStale, gluePath }: { onlyIfStale: boolean; gluePath: string }): boolean {
  if (!isPatched()) throw new Error('Run "Patch Finicky Config" first');
  const entry = readEntry();
  if (entry.gluePath !== gluePath) {
    writeEntry({ ...entry, gluePath });
    return true;
  }
  if (onlyIfStale) {
    // Stale when either import is newer than the entry: the user's config, or the glue after an extension update.
    const newestImport = Math.max(statSync(entry.originalPath).mtimeMs, statSync(gluePath).mtimeMs);
    if (newestImport <= statSync(ENTRY).mtimeMs) return false;
  }
  writeFileSync(ENTRY, readFileSync(ENTRY));
  return true;
}

function readEntry(): Entry {
  return parseEntry(readFileSync(ENTRY, "utf8"));
}

/** In place, never temp-file-and-rename: Finicky would treat a rename as the config being removed. */
function writeEntry(entry: Entry): void {
  writeFileSync(ENTRY, renderEntry(entry));
}

/** The user's config as Finicky would find it, unresolved, or null. */
function findOriginal(): string | null {
  return FINICKY_CONFIG_CANDIDATES.find(exists) ?? null;
}

/** True for anything at the path, dangling symlinks included. */
function exists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function linkTarget(path: string): string | null {
  try {
    return lstatSync(path).isSymbolicLink() ? resolve(dirname(path), readlinkSync(path)) : null;
  } catch {
    return null;
  }
}
