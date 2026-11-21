import { environment, LocalStorage } from "@raycast/api";
import { configurationFromPreferences } from "./backend";

export interface Folders {
  roots: string[];
  codeRoots: string[];
  excludedFolders: string[];
}

export async function readConfiguration() {
  const saved = await LocalStorage.getItem<string>("folders");
  const folders: unknown = saved ? JSON.parse(saved) : {};
  if (!folders || typeof folders !== "object" || Array.isArray(folders))
    throw new Error("Invalid folder settings. Choose your folders again.");
  const prefs = folders as Record<string, unknown>;
  return configurationFromPreferences(
    { ...prefs, codeExcludedFolders: prefs.excludedFolders },
    environment.assetsPath,
    environment.supportPath,
  );
}

export async function saveFolders(folders: Folders) {
  configurationFromPreferences(
    { ...folders },
    environment.assetsPath,
    environment.supportPath,
  );
  await LocalStorage.setItem("folders", JSON.stringify(folders));
}
