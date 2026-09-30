import { readFileSync, statSync } from "fs";
import { join } from "path";
import { runCli, runCliText } from "./cli";
import {
  FileSettings,
  LinkTarget,
  linkableFiles,
  listNotes,
  obsidianLinkTargets,
  parseAliases,
  parseFileList,
  parseTags,
} from "./links";

/** The vault a form belongs to; `cli` is set in full mode. */
export interface VaultRef {
  vaultPath: string;
  vaultName: string;
  cli?: string;
}

/** `[[` targets: Obsidian's own files and aliases via the CLI, or a scan of the vault's notes without it. */
export async function loadLinkTargets(vault: VaultRef): Promise<LinkTarget[]> {
  if (vault.cli) {
    const [files, aliases] = await Promise.all([
      runCliText(vault.cli, vault.vaultName, "files"),
      runCliText(vault.cli, vault.vaultName, "aliases", ["verbose"]),
    ]);
    if (files.kind === "text") {
      const mtimeOf = (path: string) => {
        try {
          return statSync(join(vault.vaultPath, path)).mtimeMs;
        } catch {
          return 0;
        }
      };
      return obsidianLinkTargets(
        linkableFiles(parseFileList(files.text), fileSettings(vault.vaultPath)),
        aliases.kind === "text" ? parseAliases(aliases.text) : [],
        mtimeOf,
      );
    }
  }
  // Exclude first, then choose link text among the notes that remain (as Obsidian's own suggester would).
  const newestFirst = listNotes(vault.vaultPath).map((note) => note.path);
  const kept = linkableFiles(newestFirst, fileSettings(vault.vaultPath));
  const rank = new Map(kept.map((path, index) => [path, -index]));
  return obsidianLinkTargets(kept, [], (path) => rank.get(path) ?? 0);
}

/** The vault's "Files and links" settings that decide what `[[` offers. */
function fileSettings(vaultPath: string): FileSettings {
  try {
    const app = JSON.parse(readFileSync(join(vaultPath, ".obsidian/app.json"), "utf8")) as Record<string, unknown>;
    return {
      showUnsupportedFiles: app.showUnsupportedFiles === true,
      userIgnoreFilters: Array.isArray(app.userIgnoreFilters)
        ? app.userIgnoreFilters.filter((f): f is string => typeof f === "string")
        : [],
    };
  } catch {
    return {};
  }
}

/** `#` suggestions from Obsidian's tag index, most used first; none without the CLI. */
export async function loadTags(vault: VaultRef): Promise<{ tag: string; count: number }[]> {
  if (!vault.cli) return [];
  const result = await runCli(vault.cli, vault.vaultName, "tags", ["counts", "sort=count", "format=json"]);
  return result.kind === "json" ? parseTags(result.data) : [];
}
