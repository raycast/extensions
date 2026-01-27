import { getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import * as fsAsync from "fs/promises";
import { homedir } from "os";
import path from "path";
import { GlobalPreferences } from "../../utils/preferences";
import { ObsidianVault } from "./vault";

interface ObsidianVaultJSON {
  path: string;
  ts: number;
  open: boolean;
}

export interface ObsidianJSON {
  vaults: Record<string, ObsidianVaultJSON>;
}

export function getVaultNameFromPath(vaultPath: string): string | undefined {
  if (vaultPath === "") {
    return undefined;
  }
  return path.basename(vaultPath);
}

export function getVaultsFromPreferences(): ObsidianVault[] {
  const pref: GlobalPreferences = getPreferenceValues();
  const vaultString = pref.vaultPath;

  return vaultString
    .split(",")
    .map((vaultPath) => vaultPath.trim())
    .filter((vaultPath) => vaultPath !== "")
    .filter((vaultPath) => fs.existsSync(vaultPath))
    .map((vault) => ({
      name: getVaultNameFromPath(vault) ?? "invalid vault name",
      key: vault,
      path: vault,
    }));
}

export async function getVaultsFromObsidianJson(): Promise<ObsidianVault[]> {
  const obsidianJsonPath = path.resolve(
    path.join(homedir(), "Library", "Application Support", "obsidian", "obsidian.json")
  );

  try {
    const obsidianJson = JSON.parse(await fsAsync.readFile(obsidianJsonPath, "utf8")) as ObsidianJSON;
    return Object.values(obsidianJson.vaults).map(({ path }) => ({
      name: getVaultNameFromPath(path) ?? "invalid vault name",
      key: path,
      path,
    }));
  } catch (e) {
    return [];
  }
}

export async function getVaultsFromPreferencesOrObsidianJson(): Promise<ObsidianVault[]> {
  let vaults = getVaultsFromPreferences();
  if (vaults.length === 0) {
    vaults = await getVaultsFromObsidianJson();
  }
  return vaults;
}

/**
 * Validates that a note path is within a configured vault.
 * Returns true if the path starts with any vault path, false otherwise.
 */
export function validateNotePath(notePath: string, vaults: ObsidianVault[]): boolean {
  return vaults.some((vault) => notePath.startsWith(vault.path));
}

export enum ObsidianTargetType {
  OpenVault = "obsidian://open?vault=",
  OpenPath = "obsidian://open?path=",
  OpenWorkspace = "obsidian://adv-uri?",
  DailyNote = "obsidian://adv-uri?daily=true&vault=",
  DailyNoteAppend = "obsidian://adv-uri?daily=true&",
  NewNote = "obsidian://new?vault=",
  AppendTask = "obsidian://adv-uri?mode=append&filepath=",
}

export type ObsidianTarget =
  | { type: ObsidianTargetType.OpenVault; vault: ObsidianVault }
  | { type: ObsidianTargetType.OpenPath; path: string }
  | { type: ObsidianTargetType.OpenWorkspace; vault: ObsidianVault; workspace: string }
  | { type: ObsidianTargetType.DailyNote; vault: ObsidianVault }
  | {
      type: ObsidianTargetType.DailyNoteAppend;
      vault: ObsidianVault;
      text: string;
      heading?: string;
      prepend?: boolean;
      silent?: boolean;
    }
  | { type: ObsidianTargetType.NewNote; vault: ObsidianVault; name: string; content?: string }
  | {
      type: ObsidianTargetType.AppendTask;
      vault: ObsidianVault;
      text: string;
      path: string;
      heading?: string;
      silent?: boolean;
    };

export function getObsidianTarget(target: ObsidianTarget) {
  switch (target.type) {
    case ObsidianTargetType.OpenVault: {
      return ObsidianTargetType.OpenVault + encodeURIComponent(target.vault.name);
    }
    case ObsidianTargetType.OpenPath: {
      return ObsidianTargetType.OpenPath + encodeURIComponent(target.path);
    }
    case ObsidianTargetType.OpenWorkspace: {
      return (
        ObsidianTargetType.OpenWorkspace +
        "vault=" +
        encodeURIComponent(target.vault.name) +
        "&workspace=" +
        encodeURIComponent(target.workspace)
      );
    }
    case ObsidianTargetType.DailyNote: {
      return ObsidianTargetType.DailyNote + encodeURIComponent(target.vault.name);
    }
    case ObsidianTargetType.DailyNoteAppend: {
      const headingParam = target.heading ? "&heading=" + encodeURIComponent(target.heading) : "";
      return (
        ObsidianTargetType.DailyNoteAppend +
        (target.prepend ? "&mode=prepend" : "&mode=append") +
        "&data=" +
        encodeURIComponent(target.text) +
        "&vault=" +
        encodeURIComponent(target.vault.name) +
        headingParam +
        (target.silent ? "&openmode=silent" : "")
      );
    }
    case ObsidianTargetType.NewNote: {
      return (
        ObsidianTargetType.NewNote +
        encodeURIComponent(target.vault.name) +
        "&name=" +
        encodeURIComponent(target.name) +
        "&content=" +
        encodeURIComponent(target.content || "")
      );
    }
    case ObsidianTargetType.AppendTask: {
      const headingParam = target.heading ? "&heading=" + encodeURIComponent(target.heading) : "";
      return (
        ObsidianTargetType.AppendTask +
        encodeURIComponent(target.path) +
        "&data=" +
        encodeURIComponent(target.text) +
        "&vault=" +
        encodeURIComponent(target.vault.name) +
        headingParam +
        (target.silent ? "&openmode=silent" : "")
      );
    }
    default: {
      return "";
    }
  }
}
