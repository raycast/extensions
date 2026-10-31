// Writes to the user's own fabric objects. Every target folder is resolved and
// checked by paths.guardDir, so nothing ever lands under fabric's built-in
// patterns folder (ISC-8, 8.1), whatever symlink, `..` or case trick the path holds.

import {
  closeSync,
  copyFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { BUILT_IN_STRATEGIES } from "./actions";
import { isPlainName, NAME } from "./argv";
import { guardDir, inProtected, PathError } from "./paths";
import { chainJson, isModelName, isVendorName, parseWorkflow, type WorkflowStep } from "./workflow";

export function checkName(name: string, what = "name"): string {
  // Editors title the field Name (New Name for a rename), so a blank one says so rather than listing
  // the allowed characters.
  if (!name) throw new PathError("Name is required");
  if (!isPlainName(name)) throw new PathError(`${what} must be letters, digits, _ . - only: ${name}`);
  return name;
}

/** Folders in the Custom Patterns folder (fabric may or may not see them). */
export function listMyPatterns(myDir: string): string[] {
  try {
    return readdirSync(myDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && NAME.test(d.name))
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

/** Resolves `myDir/name` and refuses anything that is a symlink or escapes `myDir`. */
function ownChild(myDir: string, name: string, patternsRoot: string): { dir: string; path: string } {
  return ownFile(myDir, checkName(name, "pattern name"), patternsRoot);
}

function writeFileNew(path: string, text: string) {
  const fd = openSync(path, "wx", 0o644);
  try {
    writeSync(fd, text);
  } finally {
    closeSync(fd);
  }
}

/** Copies a pattern to `<name>_copy` (then `_copy2`, `_copy3`…) in Custom Patterns and returns the new name. */
export function duplicatePattern(srcDir: string, myDir: string, name: string, patternsRoot: string): string {
  checkName(name, "pattern name");
  const dir = guardDir(myDir, patternsRoot);
  for (let i = 1; i < 100; i++) {
    const copy = `${name}_copy${i === 1 ? "" : i}`;
    const dest = join(dir, copy);
    try {
      mkdirSync(dest); // not recursive: fails if it exists, so nothing is merged into an old folder
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw e;
    }
    for (const f of ["system.md", "user.md"]) {
      const src = join(srcDir, f);
      if (existsSync(src)) copyFileSync(src, join(dest, f), 1 /* COPYFILE_EXCL */);
    }
    return copy;
  }
  throw new PathError(`too many copies of ${name}`);
}

/**
 * Saves one of the user's own patterns. A new name must not exist yet; a
 * rename moves the folder and refuses an existing target. Files are written to
 * a temp name and renamed over, so a failed save never leaves half a file.
 */
export function savePattern(
  myDir: string,
  patternsRoot: string,
  p: { name: string; system: string; user?: string; previousName?: string },
): string {
  const { dir, path } = ownChild(myDir, p.name, patternsRoot);
  if (p.previousName && p.previousName !== p.name) {
    const old = ownChild(myDir, p.previousName, patternsRoot).path;
    if (!caseVariant(old, path) && existsSync(path)) throw new PathError(`a pattern called ${p.name} already exists`);
    renameSync(old, path);
  } else if (!p.previousName) {
    mkdirSync(path); // throws EEXIST for a new pattern whose name is taken
  }
  if (realpathSync(path) !== join(realpathSync(dir), p.name)) throw new PathError("pattern folder moved under us");
  const put = (file: string, text: string) => {
    const tmp = join(path, `.${file}.${process.pid}.tmp`);
    writeFileNew(tmp, text);
    renameSync(tmp, join(path, file));
  };
  put("system.md", p.system);
  if (p.user?.trim()) put("user.md", p.user);
  else rmSync(join(path, "user.md"), { force: true });
  return path;
}

export function deletePattern(myDir: string, name: string, patternsRoot: string) {
  const { path } = ownChild(myDir, name, patternsRoot);
  rmSync(path, { recursive: true });
}

/** After a save: can fabric see it? If not, its custom-patterns setting points elsewhere (ISC-32). */
export function visibility(name: string, fabricNames: string[]): "visible" | "invisible" {
  return fabricNames.includes(name) ? "visible" : "invisible";
}

// ---- strategies, contexts, profiles, sessions: one file each in their folder ----

/**
 * True when `dest` is `src` respelled (Foo → foo on macOS's case-blind disk): both names reach one
 * entry, so a no-overwrite check would call the target taken, and one renameSync changes the case.
 * A second hard link also reaches the same file but is its own entry in the folder, so it stays taken,
 * however it is spelled. Names are ASCII (NAME), so toLowerCase is exact. Keep the inode test even so:
 * on a case-sensitive disk Foo and foo are two files, and a name compare alone would rename over one.
 */
function caseVariant(src: string, dest: string): boolean {
  if (basename(src).toLowerCase() !== basename(dest).toLowerCase()) return false;
  const [a, b] = [lstatSync(src, { throwIfNoEntry: false }), lstatSync(dest, { throwIfNoEntry: false })];
  return !!a && !!b && a.ino === b.ino && a.dev === b.dev && !readdirSync(dirname(dest)).includes(basename(dest));
}

function ownFile(dir: string, file: string, patternsRoot: string): { dir: string; path: string } {
  const real = guardDir(dir, patternsRoot);
  const path = join(real, file);
  // The folder can be fine while the child is the protected root itself (Custom Patterns = ~/.config/fabric).
  if (inProtected(path, patternsRoot)) throw new PathError("fabric's built-in patterns folder is never written to");
  try {
    if (lstatSync(path).isSymbolicLink()) throw new PathError(`${file} is a symlink; refusing to touch it`);
  } catch (e) {
    if (e instanceof PathError) throw e;
  }
  return { dir: real, path };
}

/**
 * Writes `text` to `dir/file` atomically. A new file (or a rename target)
 * must not exist yet: the temp file is hard-linked into place, which fails
 * on an existing name, symlink or not. A case-only rename (caseVariant) is
 * respelled first and then saved in place.
 */
export function saveOwnFile(dir: string, file: string, text: string, patternsRoot: string, previousFile?: string) {
  const { dir: real, path } = ownFile(dir, file, patternsRoot);
  const tmp = join(real, `.${file}.${process.pid}.tmp`);
  writeFileNew(tmp, text);
  try {
    const previous = previousFile && previousFile !== file ? ownFile(dir, previousFile, patternsRoot).path : undefined;
    const caseOnly = !!previous && caseVariant(previous, path);
    if (caseOnly) renameSync(previous, path);
    if (previousFile === file || caseOnly) renameSync(tmp, path);
    else {
      try {
        linkSync(tmp, path);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new PathError(`${file} already exists`);
        throw e;
      }
      if (previous) rmSync(previous, { force: true });
    }
  } finally {
    rmSync(tmp, { force: true });
  }
  return path;
}

/**
 * Saves a chain as `<name>.json` in the workflows folder. What is written is what fabric will run, so it
 * passes parseWorkflow first (a repeat, a path or a missing pattern is refused with nothing written).
 * The inner name is the file's: identity is the file name, so a hand-edited inner name can't mislead.
 */
export function saveChain(
  dir: string,
  patternsRoot: string,
  c: { name: string; steps: WorkflowStep[]; previousName?: string },
  installed: ReadonlySet<string>,
) {
  const name = checkName(c.name, "chain name");
  const text = chainJson({ name, steps: c.steps });
  const parsed = parseWorkflow(text, installed);
  if (!parsed.ok) throw new PathError(parsed.reason);
  return saveOwnFile(dir, `${name}.json`, text, patternsRoot, c.previousName && `${c.previousName}.json`);
}

export function deleteOwnFile(dir: string, file: string, patternsRoot: string) {
  rmSync(ownFile(dir, file, patternsRoot).path);
}

export function strategyJson(description: string, prompt: string): string {
  return JSON.stringify({ description, prompt }, null, 4) + "\n";
}

export interface ProfileFields {
  model?: string;
  vendor?: string;
  temperature?: string;
  topp?: string;
  suppressThink?: boolean;
}

/**
 * A run profile as fabric `--config` YAML. Only keys fabric was probed to
 * honor are written (it ignores unknown ones silently), plus `vendor`, which
 * loadProfiles reads back for --vendor; never `pattern:`, and blank fields are left out.
 */
export function profileYaml(f: ProfileFields): string {
  const lines: string[] = [];
  const num = (k: string, v: string | undefined, max: number) => {
    if (!v?.trim()) return;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max) throw new PathError(`${k} must be a number from 0 to ${max}`);
    lines.push(`${k}: ${n}`);
  };
  if (f.model?.trim()) {
    if (!isModelName(f.model)) throw new PathError(`not a model name: ${f.model}`);
    lines.push(`model: ${f.model}`);
    if (f.vendor?.trim()) {
      if (!isVendorName(f.vendor)) throw new PathError(`not a vendor name: ${f.vendor}`);
      lines.push(`vendor: ${f.vendor}`);
    }
  }
  num("temperature", f.temperature, 2);
  num("topp", f.topp, 1);
  if (f.suppressThink) lines.push("suppressThink: true");
  return lines.join("\n") + "\n";
}

/** Saves a strategy; fabric's shipped ones stay pristine, so their names are refused. */
export function saveStrategy(
  dir: string,
  patternsRoot: string,
  s: { name: string; description: string; prompt: string; previousName?: string },
) {
  checkName(s.name, "strategy name");
  if (BUILT_IN_STRATEGIES.has(s.name) || (s.previousName && BUILT_IN_STRATEGIES.has(s.previousName)))
    throw new PathError(`${s.name} is one of fabric's built-in strategies; duplicate it instead`);
  return saveOwnFile(
    dir,
    `${s.name}.json`,
    strategyJson(s.description, s.prompt),
    patternsRoot,
    s.previousName && `${s.previousName}.json`,
  );
}

/**
 * Renames a session file; an existing target is refused (ISC-35.2), its own name is a no-op (ISC-48),
 * and a case-only rename goes through (ISC-51).
 */
export function renameSession(dir: string, from: string, to: string, patternsRoot: string) {
  checkName(from, "session name");
  checkName(to, "session name");
  const src = ownFile(dir, `${from}.json`, patternsRoot).path;
  if (from === to) {
    lstatSync(src); // a missing file throws ENOENT here, as it does for any other rename
    return src;
  }
  const dest = ownFile(dir, `${to}.json`, patternsRoot).path;
  if (caseVariant(src, dest)) renameSync(src, dest);
  else {
    linkSync(src, dest); // fails with EEXIST rather than overwrite
    rmSync(src);
  }
  return dest;
}
