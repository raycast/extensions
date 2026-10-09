import { randomUUID, createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { commitItem } from "./git";

async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

/** Only the paths in Configuration Mapping may become managed items. */
export type ItemCategory = "plugins" | "themes" | "snippets" | "settings";
export type ItemState =
  "linked" | "native-unique" | "native-identical" | "native-branched" | "available" | "broken" | "foreign-link";

export interface VaultItem {
  id: string;
  name: string;
  category: ItemCategory;
  state: ItemState;
  defaultVault: string;
  targetVault: string;
  defaultPath: string;
  targetPath: string;
}

const SETTINGS = [
  "app.json",
  "appearance.json",
  "hotkeys.json",
  "community-plugins.json",
  "core-plugins.json",
] as const;
const CATEGORIES: ItemCategory[] = ["plugins", "themes", "snippets", "settings"];
const STAGING_PREFIX = ".obsidian-symlink-manager-";

type Existing = Awaited<ReturnType<typeof fs.lstat>>;
type Location = { defaultVault: string; targetVault: string; defaultPath: string; targetPath: string };

async function lstatOrNull(filePath: string): Promise<Existing | null> {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function validName(category: ItemCategory, name: string): boolean {
  if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\") || name.includes("\0"))
    return false;
  if (name.startsWith(STAGING_PREFIX)) return false;
  if (category === "settings") return (SETTINGS as readonly string[]).includes(name);
  if (name.startsWith(".")) return false;
  if (category === "snippets") return name.endsWith(".css");
  return true;
}

function itemPath(vault: string, category: ItemCategory, name: string): string {
  return path.join(vault, ".obsidian", ...(category === "settings" ? [] : [category]), name);
}

async function checkedVault(vault: string): Promise<string> {
  if (!path.isAbsolute(vault)) throw new Error("Vault path must be absolute.");
  const canonical = await fs.realpath(vault);
  const obsidian = path.join(canonical, ".obsidian");
  const stat = await lstatOrNull(obsidian);
  if (!stat?.isDirectory() || stat.isSymbolicLink()) throw new Error(`Invalid .obsidian directory: ${obsidian}`);
  return canonical;
}

async function checkedParent(vault: string, category: ItemCategory, create = false): Promise<string> {
  const parent = path.join(vault, ".obsidian", ...(category === "settings" ? [] : [category]));
  if (create && category !== "settings") {
    const existing = await lstatOrNull(parent);
    if (!existing) await fs.mkdir(parent);
  }
  const stat = await lstatOrNull(parent);
  if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error(`Unsafe managed directory: ${parent}`);
  return parent;
}

async function checkedLocation(
  item: VaultItem,
  createTargetParent = false,
  createDefaultParent = false,
): Promise<Location> {
  if (!CATEGORIES.includes(item.category) || !validName(item.category, item.name))
    throw new Error("Item is outside the allowed configuration paths.");
  const defaultVault = await checkedVault(item.defaultVault);
  const targetVault = await checkedVault(item.targetVault);
  if (defaultVault === targetVault) throw new Error("Default and target vault must differ.");
  await checkedParent(defaultVault, item.category, createDefaultParent);
  await checkedParent(targetVault, item.category, createTargetParent);
  const defaultPath = itemPath(defaultVault, item.category, item.name);
  const targetPath = itemPath(targetVault, item.category, item.name);
  if (path.resolve(item.defaultPath) !== defaultPath || path.resolve(item.targetPath) !== targetPath) {
    throw new Error("Item paths do not match its vault and name.");
  }
  return { defaultVault, targetVault, defaultPath, targetPath };
}

async function namesIn(vault: string, category: ItemCategory): Promise<string[]> {
  if (category === "settings") return [...SETTINGS];
  const parent = await checkedParent(vault, category);
  if (!(await lstatOrNull(parent))) return [];
  const names = await fs.readdir(parent);
  return names.filter((name) => validName(category, name));
}

async function sameContents(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([lstatOrNull(left), lstatOrNull(right)]);
  if (!a || !b) return false;
  if (a.isSymbolicLink() || b.isSymbolicLink()) {
    return a.isSymbolicLink() && b.isSymbolicLink() && (await fs.readlink(left)) === (await fs.readlink(right));
  }
  if (a.isFile() && b.isFile()) {
    if (a.size !== b.size) return false;
    return (await hashFile(left)) === (await hashFile(right));
  }
  if (!a.isDirectory() || !b.isDirectory()) return false;
  const [leftNames, rightNames] = await Promise.all([fs.readdir(left), fs.readdir(right)]);
  leftNames.sort();
  rightNames.sort();
  if (leftNames.length !== rightNames.length || leftNames.some((name, index) => name !== rightNames[index]))
    return false;
  for (const name of leftNames) {
    if (!(await sameContents(path.join(left, name), path.join(right, name)))) return false;
  }
  return true;
}

async function stateOf(defaultPath: string, targetPath: string, category: ItemCategory): Promise<ItemState | null> {
  const [source, target] = await Promise.all([lstatOrNull(defaultPath), lstatOrNull(targetPath)]);
  const expectsDirectory = category === "plugins" || category === "themes";
  const usableSource = Boolean(
    source && !source.isSymbolicLink() && (expectsDirectory ? source.isDirectory() : source.isFile()),
  );
  if (!target) return usableSource ? "available" : null;
  if (target.isSymbolicLink()) {
    const destination = path.resolve(path.dirname(targetPath), await fs.readlink(targetPath));
    if (destination !== defaultPath) return "foreign-link";
    return usableSource ? "linked" : "broken";
  }
  if (expectsDirectory ? !target.isDirectory() : !target.isFile()) return null;
  if (!usableSource) return "native-unique";
  return (await sameContents(defaultPath, targetPath)) ? "native-identical" : "native-branched";
}

/** Compare only whitelisted Obsidian items, without following symlinks. */
export async function scanItems(defaultVaultPath: string, targetVaultPath: string): Promise<VaultItem[]> {
  const [defaultVault, targetVault] = await Promise.all([
    checkedVault(defaultVaultPath),
    checkedVault(targetVaultPath),
  ]);
  if (defaultVault === targetVault) throw new Error("Default and target vault must differ.");
  const items: VaultItem[] = [];
  for (const category of CATEGORIES) {
    if (category === "snippets") {
      const sourceFolder = path.join(defaultVault, ".obsidian", "snippets");
      const targetFolder = path.join(targetVault, ".obsidian", "snippets");
      const targetFolderStat = await lstatOrNull(targetFolder);
      if (targetFolderStat?.isSymbolicLink()) {
        const destination = path.resolve(path.dirname(targetFolder), await fs.readlink(targetFolder));
        if (destination !== sourceFolder) throw new Error("Target snippets folder points outside the Default Vault.");
        // The folder-level bootstrap link is intentionally not exposed as per-file items.
        continue;
      }
    }
    const [sourceNames, targetNames] = await Promise.all([
      namesIn(defaultVault, category),
      namesIn(targetVault, category),
    ]);
    const names = [...new Set([...sourceNames, ...targetNames])].sort((a, b) => a.localeCompare(b));
    for (const name of names) {
      const defaultPath = itemPath(defaultVault, category, name);
      const targetPath = itemPath(targetVault, category, name);
      const state = await stateOf(defaultPath, targetPath, category);
      if (state)
        items.push({
          id: `${category}/${name}`,
          name,
          category,
          state,
          defaultVault,
          targetVault,
          defaultPath,
          targetPath,
        });
    }
  }
  return items;
}

function requireConfirmed(confirmed: boolean | undefined): void {
  if (confirmed !== true) throw new Error("This operation requires user confirmation.");
}

async function rollbackAndThrow(error: unknown, steps: Array<() => Promise<void>>): Promise<never> {
  const failures: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (failure) {
      failures.push(failure);
    }
  }
  if (failures.length)
    throw new AggregateError([error, ...failures], "The operation failed and rollback was incomplete.");
  throw error;
}

function stagingPath(original: string): string {
  return path.join(path.dirname(original), `${STAGING_PREFIX}${randomUUID()}`);
}

async function removeStaging(filePath: string): Promise<void> {
  const stat = await lstatOrNull(filePath);
  if (!stat) return;
  if (stat.isSymbolicLink()) {
    await fs.unlink(filePath);
  } else {
    await fs.rm(filePath, { recursive: stat.isDirectory() });
  }
}

async function assertNoNestedLinks(filePath: string): Promise<void> {
  const stat = await fs.lstat(filePath);
  if (stat.isSymbolicLink()) throw new Error(`Nested symlinks cannot be copied safely: ${filePath}`);
  if (stat.isDirectory()) {
    for (const name of await fs.readdir(filePath)) await assertNoNestedLinks(path.join(filePath, name));
  } else if (!stat.isFile()) {
    throw new Error(`Unsupported file type: ${filePath}`);
  }
}

async function assertExpectedType(filePath: string, category: ItemCategory): Promise<void> {
  const stat = await fs.lstat(filePath);
  const wantsDirectory = category === "plugins" || category === "themes";
  if (stat.isSymbolicLink() || (wantsDirectory ? !stat.isDirectory() : !stat.isFile())) {
    throw new Error(`Unexpected item type for ${category}: ${filePath}`);
  }
}

/** Validate a physical, independent pair before any selective edit. */
export async function checkedIndependentItem(item: VaultItem): Promise<{ defaultPath: string; targetPath: string }> {
  const { defaultPath, targetPath } = await checkedLocation(item);
  const state = await stateOf(defaultPath, targetPath, item.category);
  if (state !== "native-branched" && state !== "native-identical")
    throw new Error("Selective sync requires independent physical copies in both vaults.");
  await Promise.all([assertExpectedType(defaultPath, item.category), assertExpectedType(targetPath, item.category)]);
  await Promise.all([assertNoNestedLinks(defaultPath), assertNoNestedLinks(targetPath)]);
  return { defaultPath, targetPath };
}

/** Refresh a selected item after an in-place edit without rescanning the whole vault. */
export async function refreshItem(item: VaultItem, revision: number): Promise<VaultItem> {
  void revision;
  const { defaultPath, targetPath } = await checkedLocation(item);
  const state = await stateOf(defaultPath, targetPath, item.category);
  if (!state) throw new Error("The selected item is no longer available.");
  return { ...item, state };
}

async function stageCopy(source: string, destination: string): Promise<void> {
  await assertNoNestedLinks(source);
  const stat = await fs.lstat(source);
  try {
    await fs.cp(source, destination, {
      recursive: stat.isDirectory(),
      errorOnExist: true,
      force: false,
      dereference: false,
    });
  } catch (error) {
    await removeStaging(destination);
    throw error;
  }
}

async function unlinkVerified(filePath: string): Promise<void> {
  const stat = await fs.lstat(filePath);
  if (!stat.isSymbolicLink()) throw new Error(`Refusing to unlink a non-symlink: ${filePath}`);
  await fs.unlink(filePath);
}

/** Link a default item. Overwriting a native item requires confirmed=true. */
export async function pullItem(item: VaultItem, confirmed = false): Promise<void> {
  if (item.category === "settings") throw new Error("Core settings use local JSON files. Mirror settings instead.");
  const { defaultPath, targetPath } = await checkedLocation(item, true);
  const state = await stateOf(defaultPath, targetPath, item.category);
  if (!state || state === "foreign-link")
    throw new Error("Default source is unavailable or target has an unrelated symlink.");
  if (state === "linked") return;
  if (state === "broken") {
    throw new Error("The default source is missing; restore it before pulling.");
  }
  if (state !== "available") requireConfirmed(confirmed);
  await assertExpectedType(defaultPath, item.category);
  await assertNoNestedLinks(defaultPath);
  const backup = state === "available" ? null : stagingPath(targetPath);
  if (backup) await fs.rename(targetPath, backup);
  try {
    await fs.symlink(
      defaultPath,
      targetPath,
      item.category === "plugins" || item.category === "themes" ? "dir" : "file",
    );
  } catch (error) {
    await rollbackAndThrow(error, [
      async () => {
        if ((await lstatOrNull(targetPath))?.isSymbolicLink()) await unlinkVerified(targetPath);
      },
      async () => {
        if (backup) await fs.rename(backup, targetPath);
      },
    ]);
  }
  if (backup) await removeStaging(backup);
}

/** Copy a Default Vault item into the target as an independent physical item. */
export async function pullCopyItem(item: VaultItem, confirmed = false): Promise<void> {
  if (item.category === "settings") throw new Error("Core settings use local JSON files. Mirror settings instead.");
  const { defaultPath, targetPath } = await checkedLocation(item, true);
  const state = await stateOf(defaultPath, targetPath, item.category);
  if (state === "linked") return detachItem(item);
  if (state !== "available" && state !== "native-identical" && state !== "native-branched") {
    throw new Error("A physical Default Vault source and a safe target are required to pull a copy.");
  }
  if (state !== "available") requireConfirmed(confirmed);
  await assertExpectedType(defaultPath, item.category);
  const staged = stagingPath(targetPath);
  const backup = state === "available" ? null : stagingPath(targetPath);
  await stageCopy(defaultPath, staged);
  try {
    if (backup) await fs.rename(targetPath, backup);
    else if (await lstatOrNull(targetPath))
      throw new Error("The target appeared while copying. Refresh and try again.");
    await fs.rename(staged, targetPath);
  } catch (error) {
    await rollbackAndThrow(error, [
      async () => {
        if (backup && (await lstatOrNull(backup))) await fs.rename(backup, targetPath);
      },
      async () => removeStaging(staged),
    ]);
  }
  if (backup) await removeStaging(backup);
}

/** Copy native target into default, then replace target with a symlink. */
export async function pushItem(item: VaultItem, confirmed = false): Promise<void> {
  requireConfirmed(confirmed);
  if (item.category === "settings") throw new Error("Core settings use local JSON files. Sync a setting instead.");
  const { defaultPath, targetPath, targetVault, defaultVault } = await checkedLocation(item, false, true);
  const state = await stateOf(defaultPath, targetPath, item.category);
  if (!state?.startsWith("native-")) throw new Error("Push requires a native target item.");
  await assertExpectedType(targetPath, item.category);
  await assertNoNestedLinks(targetPath);
  const sourceStat = await lstatOrNull(defaultPath);
  if (sourceStat?.isSymbolicLink()) throw new Error("Default source is a symlink; refusing to overwrite it.");
  const relativePath = path.relative(path.join(defaultVault, ".obsidian"), defaultPath);
  if (sourceStat) {
    await assertExpectedType(defaultPath, item.category);
    await commitItem(defaultVault, relativePath, `Snapshot ${relativePath} before push`);
  }
  const stagedSource = stagingPath(defaultPath);
  const backedSource = sourceStat ? stagingPath(defaultPath) : null;
  const backedTarget = stagingPath(targetPath);
  await stageCopy(targetPath, stagedSource);
  let sourceInstalled = false;
  let targetMoved = false;
  try {
    if (backedSource) await fs.rename(defaultPath, backedSource);
    await fs.rename(stagedSource, defaultPath);
    sourceInstalled = true;
    await fs.rename(targetPath, backedTarget);
    targetMoved = true;
    await fs.symlink(
      defaultPath,
      targetPath,
      item.category === "plugins" || item.category === "themes" ? "dir" : "file",
    );
    await commitItem(defaultVault, relativePath, `Pushed ${relativePath} from ${path.basename(targetVault)}`);
  } catch (error) {
    await rollbackAndThrow(error, [
      async () => {
        if ((await lstatOrNull(targetPath))?.isSymbolicLink()) await unlinkVerified(targetPath);
      },
      async () => {
        if (targetMoved) await fs.rename(backedTarget, targetPath);
      },
      async () => {
        if (sourceInstalled) await removeStaging(defaultPath);
      },
      async () => {
        if (backedSource) await fs.rename(backedSource, defaultPath);
      },
      async () => {
        await removeStaging(stagedSource);
      },
    ]);
  }
  await removeStaging(backedTarget);
  if (backedSource) await removeStaging(backedSource);
}

/** Materialize a linked item without ever following an unrelated symlink. */
export async function detachItem(item: VaultItem): Promise<void> {
  const { defaultPath, targetPath } = await checkedLocation(item);
  if ((await stateOf(defaultPath, targetPath, item.category)) !== "linked")
    throw new Error("Detach requires a valid default symlink.");
  await assertExpectedType(defaultPath, item.category);
  const staged = stagingPath(targetPath);
  await stageCopy(defaultPath, staged);
  try {
    await unlinkVerified(targetPath);
    await fs.rename(staged, targetPath);
  } catch (error) {
    if (!(await lstatOrNull(targetPath))) await fs.symlink(defaultPath, targetPath);
    await removeStaging(staged);
    throw error;
  }
}

export async function unlinkItem(item: VaultItem, confirmed = false): Promise<void> {
  requireConfirmed(confirmed);
  const { defaultPath, targetPath } = await checkedLocation(item);
  const state = await stateOf(defaultPath, targetPath, item.category);
  if (state !== "linked" && state !== "broken") throw new Error("Unlink requires a managed symlink.");
  await unlinkVerified(targetPath);
}

export async function deleteNativeItem(item: VaultItem, confirmed = false): Promise<void> {
  requireConfirmed(confirmed);
  const { defaultPath, targetPath } = await checkedLocation(item);
  const state = await stateOf(defaultPath, targetPath, item.category);
  if (!state?.startsWith("native-")) throw new Error("Delete requires a native target item.");
  await assertExpectedType(targetPath, item.category);
  const stat = await fs.lstat(targetPath);
  if (stat.isSymbolicLink()) throw new Error("Target changed into a symlink.");
  await fs.rm(targetPath, { recursive: stat.isDirectory() });
}
