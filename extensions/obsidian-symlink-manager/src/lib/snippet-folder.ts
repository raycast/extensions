import * as fs from "node:fs/promises";
import path from "node:path";
import { linkPointsTo } from "./paths";

const BACKUP_NAME = "snippets.symlink-manager-backup";

export type SnippetFolderMode = "individual" | "missing" | "whole-folder" | "restore-available" | "unavailable";

type Paths = { source: string; target: string; backup: string };

function paths(defaultVault: string, targetVault: string): Paths {
  return {
    source: path.join(defaultVault, ".obsidian", "snippets"),
    target: path.join(targetVault, ".obsidian", "snippets"),
    backup: path.join(targetVault, ".obsidian", BACKUP_NAME),
  };
}

async function lstatOrNull(filePath: string): Promise<Awaited<ReturnType<typeof fs.lstat>> | null> {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function validateDirectories(defaultVault: string, targetVault: string, source: string, requireSource: boolean) {
  if (!path.isAbsolute(defaultVault) || !path.isAbsolute(targetVault)) throw new Error("Vault paths must be absolute.");
  const [defaultRoot, targetRoot, sourceStat] = await Promise.all([
    fs.lstat(defaultVault),
    fs.lstat(targetVault),
    requireSource ? lstatOrNull(source) : Promise.resolve(null),
  ]);
  const defaultConfig = await fs.lstat(path.join(defaultVault, ".obsidian"));
  const targetConfig = await fs.lstat(path.join(targetVault, ".obsidian"));
  if (
    !defaultRoot.isDirectory() ||
    defaultRoot.isSymbolicLink() ||
    !targetRoot.isDirectory() ||
    targetRoot.isSymbolicLink()
  )
    throw new Error("Vault paths must be physical directories.");
  if (
    !defaultConfig.isDirectory() ||
    defaultConfig.isSymbolicLink() ||
    !targetConfig.isDirectory() ||
    targetConfig.isSymbolicLink()
  )
    throw new Error("Both vaults need physical .obsidian directories.");
  if (requireSource && (!sourceStat?.isDirectory() || sourceStat.isSymbolicLink()))
    throw new Error("The Default Vault snippets path must be a physical directory.");
  if (path.resolve(defaultVault) === path.resolve(targetVault))
    throw new Error("Default and target vault must differ.");
}

export async function getSnippetFolderMode(defaultVault: string, targetVault: string): Promise<SnippetFolderMode> {
  const { source, target, backup } = paths(defaultVault, targetVault);
  const [sourceStat, targetStat, backupStat] = await Promise.all([
    lstatOrNull(source),
    lstatOrNull(target),
    lstatOrNull(backup),
  ]);
  if (backupStat) {
    if (!backupStat.isDirectory() || backupStat.isSymbolicLink()) return "unavailable";
    if (!targetStat) return "restore-available";
    if (targetStat.isSymbolicLink()) {
      return (await linkPointsTo(target, source)) ? "restore-available" : "unavailable";
    }
    return "unavailable";
  }
  if (!sourceStat?.isDirectory() || sourceStat.isSymbolicLink()) return "unavailable";
  if (targetStat?.isSymbolicLink()) {
    return (await linkPointsTo(target, source)) ? "whole-folder" : "unavailable";
  }
  if (targetStat?.isDirectory() && !targetStat.isSymbolicLink()) return "individual";
  if (!targetStat) return "missing";
  return "unavailable";
}

/** Preserve the target's current physical snippets folder beside it before linking the shared folder. */
export async function switchToWholeSnippetFolder(defaultVault: string, targetVault: string): Promise<void> {
  const { source, target, backup } = paths(defaultVault, targetVault);
  await validateDirectories(defaultVault, targetVault, source, true);
  const [targetStat, backupStat] = await Promise.all([lstatOrNull(target), lstatOrNull(backup)]);
  if (targetStat && (!targetStat.isDirectory() || targetStat.isSymbolicLink())) {
    throw new Error("The target snippets path must be an absent path or a physical directory.");
  }
  if (backupStat) throw new Error(`A snippets backup already exists: ${backup}`);

  if (targetStat) await fs.rename(target, backup);
  else await fs.mkdir(backup);
  try {
    await fs.symlink(source, target, "dir");
  } catch (error) {
    if (targetStat) await fs.rename(backup, target);
    else await fs.rmdir(backup);
    throw error;
  }
}

/** Restore the saved target folder, removing only the verified full-folder symlink. */
export async function restoreSnippetFolder(defaultVault: string, targetVault: string): Promise<void> {
  const { source, target, backup } = paths(defaultVault, targetVault);
  await validateDirectories(defaultVault, targetVault, source, false);
  const [targetStat, backupStat] = await Promise.all([lstatOrNull(target), lstatOrNull(backup)]);
  if (!backupStat?.isDirectory() || backupStat.isSymbolicLink()) {
    throw new Error("The saved snippets backup is missing or is not a physical directory.");
  }
  if (targetStat && !targetStat.isSymbolicLink()) {
    throw new Error("The target snippets path is not the managed folder symlink; no changes were made.");
  }
  if (targetStat && !(await linkPointsTo(target, source))) {
    throw new Error("The target snippets link points somewhere else; no changes were made.");
  }

  if (targetStat) await fs.unlink(target);
  try {
    await fs.rename(backup, target);
  } catch (error) {
    if (targetStat && !(await lstatOrNull(target))) await fs.symlink(source, target, "dir");
    throw error;
  }
}
