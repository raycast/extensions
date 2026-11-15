import { Application, getPreferenceValues } from "@raycast/api";

export type ItemType = "folders" | "files" | "both";

type RawPreferences = {
  maxDepth?: string;
  itemType?: ItemType;
  showHidden?: boolean;
  excludeNames?: string;
  terminalApp?: Application;
  editorApp?: Application;
  maxResults?: string;
};

export type ResolvedPreferences = {
  /** 0 means unlimited. */
  maxDepth: number;
  itemType: ItemType;
  showHidden: boolean;
  excludeNames: Set<string>;
  terminalApp?: Application;
  editorApp?: Application;
  maxResults: number;
};

function toInt(
  value: string | undefined,
  fallback: number,
  min: number,
): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

export function getPreferences(): ResolvedPreferences {
  const raw = getPreferenceValues<RawPreferences>();

  const excludeNames = new Set(
    (raw.excludeNames ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0),
  );

  return {
    maxDepth: toInt(raw.maxDepth, 1, 0),
    itemType: raw.itemType ?? "folders",
    showHidden: raw.showHidden === true,
    excludeNames,
    terminalApp: raw.terminalApp,
    editorApp: raw.editorApp,
    maxResults: toInt(raw.maxResults, 5000, 1),
  };
}
