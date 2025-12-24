import { LocalStorage } from "@raycast/api";

const STORAGE_KEYS = {
  selection: "make.selection.v1",
} as const;

export type MakeSelection = {
  organizationId: number;
  organizationName: string;
  teamId: number;
  teamName: string;
  apiLimitPerMinute?: number;
  apiLimitFetchedAtMs?: number;
  operationsLimit?: number;
  restartPeriod?: string;
};

export async function getSelection(): Promise<MakeSelection | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.selection);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as MakeSelection;
    if (
      typeof parsed?.organizationId !== "number" ||
      typeof parsed?.organizationName !== "string" ||
      typeof parsed?.teamId !== "number" ||
      typeof parsed?.teamName !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setSelection(selection: MakeSelection): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.selection, JSON.stringify(selection));
}

export async function clearSelection(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.selection);
}
