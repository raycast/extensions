import { environment } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { constants, type Stats } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";

async function physicalDirectory(location: string): Promise<void> {
  const stat = await fs.lstat(location);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Expected a physical directory: ${location}`);
}

async function physicalFile(location: string): Promise<Stats> {
  const stat = await fs.lstat(location);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a physical file: ${location}`);
  return stat;
}

/** Point one vault's physical LaTeX Suite settings at a version in the user's snippets folder. */
export async function configureLatexSnippetVersion(
  targetVaultPath: string,
  snippetsFolderPath: string,
  versionPath: string,
): Promise<{ changed: boolean; backup?: string; snippetsEnabled: boolean }> {
  if (!path.isAbsolute(snippetsFolderPath)) throw new Error("Choose an absolute snippets folder path.");
  if (!path.isAbsolute(versionPath)) throw new Error("Choose an absolute snippet version path.");
  const snippetsFolder = path.resolve(snippetsFolderPath);
  const version = path.resolve(versionPath);
  if (path.dirname(version) !== snippetsFolder || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.js$/.test(path.basename(version)))
    throw new Error("Choose a .js file directly inside the designated snippets folder.");
  const targetVault = path.resolve(targetVaultPath);
  const obsidian = path.join(targetVault, ".obsidian");
  const plugins = path.join(obsidian, "plugins");
  const plugin = path.join(plugins, "obsidian-latex-suite");
  const dataPath = path.join(plugin, "data.json");

  await Promise.all([
    physicalDirectory(snippetsFolder),
    physicalFile(version),
    physicalDirectory(targetVault),
    physicalDirectory(obsidian),
    physicalDirectory(plugins),
    physicalDirectory(plugin),
  ]);
  if ((await fs.realpath(snippetsFolder)) !== snippetsFolder)
    throw new Error("The snippets folder must be a physical directory, not a symlinked path.");
  if ((await fs.realpath(version)) !== version)
    throw new Error("The selected snippet version must be a physical JavaScript file.");
  const dataStat = await physicalFile(dataPath);
  const original = await fs.readFile(dataPath);
  const parsed: unknown = JSON.parse(original.toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("LaTeX Suite data.json must contain a JSON object.");
  const settings = parsed as Record<string, unknown>;
  if (settings.loadSnippetsFromFile === true && settings.snippetsFileLocation === version)
    return { changed: false, snippetsEnabled: settings.snippetsEnabled === true };

  const backupFolder = path.join(environment.supportPath, "latex-suite-settings-backups");
  await fs.mkdir(backupFolder, { recursive: true });
  const backup = path.join(backupFolder, `${Date.now()}-${randomUUID()}-data.json`);
  await fs.copyFile(dataPath, backup, constants.COPYFILE_EXCL);
  if (!(await fs.readFile(backup)).equals(original)) {
    throw new Error("LaTeX Suite settings changed while being backed up. Reopen and try again.");
  }

  const next =
    JSON.stringify({ ...settings, loadSnippetsFromFile: true, snippetsFileLocation: version }, null, 2) + "\n";
  const staged = path.join(plugin, `.data.json.${randomUUID()}.tmp`);
  let replaced = false;
  try {
    await fs.writeFile(staged, next, { flag: "wx", mode: dataStat.mode & 0o777 });
    await Promise.all([
      physicalDirectory(snippetsFolder),
      physicalFile(version),
      physicalDirectory(plugin),
      physicalFile(dataPath),
    ]);
    if (!(await fs.readFile(dataPath)).equals(original))
      throw new Error("LaTeX Suite settings changed during setup. Reopen and try again.");
    await fs.rename(staged, dataPath);
    replaced = true;
    return { changed: true, backup, snippetsEnabled: settings.snippetsEnabled === true };
  } catch (error) {
    if (replaced) {
      try {
        const restore = path.join(plugin, `.data.json.${randomUUID()}.restore`);
        await fs.copyFile(backup, restore, constants.COPYFILE_EXCL);
        await fs.rename(restore, dataPath);
      } catch (restoreError) {
        throw new Error(`LaTeX Suite settings need manual recovery from ${backup}: ${String(restoreError)}`);
      }
    }
    throw error;
  } finally {
    if (!replaced) await fs.rm(staged, { force: true });
  }
}
