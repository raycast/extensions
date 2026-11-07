import { LocalStorage } from "@raycast/api";

// TrellisWM cannot report its saved views, so view names live in Raycast only.
export const VIEW_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type ViewNames = Record<number, string>;

const STORAGE_KEY = "view-names";

export function viewTitle(n: number, names: ViewNames): string {
  return names[n] || `View ${n}`;
}

export async function loadViewNames(): Promise<ViewNames> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as ViewNames;
  } catch {
    return {};
  }
}

export async function saveViewNames(names: ViewNames): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}
