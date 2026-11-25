import { LocalStorage } from "@raycast/api";

export interface AppSettings {
  project: string;
  states: string[];
  types: string[];
  /** Comma-separated states to float to the top of the list, in order. */
  stateOrder: string;
  defaultRepo: string;
  defaultBaseBranch: string;
  /** When true, only show items assigned to me. Default true. */
  assignedToMe: boolean;
}

export const EMPTY_SETTINGS: AppSettings = {
  project: "",
  states: [],
  types: [],
  stateOrder: "",
  defaultRepo: "",
  defaultBaseBranch: "",
  assignedToMe: true,
};

export const STORAGE_KEYS = {
  project: "app.project",
  states: "app.states",
  types: "app.types",
  stateOrder: "app.stateOrder",
  defaultRepo: "app.defaultRepo",
  defaultBaseBranch: "app.defaultBaseBranch",
  assignedToMe: "app.assignedToMe",
  onboarded: "app.onboarded",
};

export async function readAppSettings(): Promise<{
  settings: AppSettings;
  onboarded: boolean;
}> {
  const [p, s, t, so, r, b, am, o] = await Promise.all([
    LocalStorage.getItem<string>(STORAGE_KEYS.project),
    LocalStorage.getItem<string>(STORAGE_KEYS.states),
    LocalStorage.getItem<string>(STORAGE_KEYS.types),
    LocalStorage.getItem<string>(STORAGE_KEYS.stateOrder),
    LocalStorage.getItem<string>(STORAGE_KEYS.defaultRepo),
    LocalStorage.getItem<string>(STORAGE_KEYS.defaultBaseBranch),
    LocalStorage.getItem<string>(STORAGE_KEYS.assignedToMe),
    LocalStorage.getItem<string>(STORAGE_KEYS.onboarded),
  ]);
  const tryParse = <T>(v: string | undefined, fallback: T): T => {
    if (typeof v !== "string") return fallback;
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  };
  return {
    settings: {
      project: tryParse<string>(p, ""),
      states: tryParse<string[]>(s, []),
      types: tryParse<string[]>(t, []),
      stateOrder: tryParse<string>(so, ""),
      defaultRepo: tryParse<string>(r, ""),
      defaultBaseBranch: tryParse<string>(b, ""),
      assignedToMe: tryParse<boolean>(am, true),
    },
    onboarded: tryParse<boolean>(o, false),
  };
}

export async function writeAppSettings(settings: AppSettings): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(STORAGE_KEYS.project, JSON.stringify(settings.project)),
    LocalStorage.setItem(STORAGE_KEYS.states, JSON.stringify(settings.states)),
    LocalStorage.setItem(STORAGE_KEYS.types, JSON.stringify(settings.types)),
    LocalStorage.setItem(STORAGE_KEYS.stateOrder, JSON.stringify(settings.stateOrder)),
    LocalStorage.setItem(STORAGE_KEYS.defaultRepo, JSON.stringify(settings.defaultRepo)),
    LocalStorage.setItem(STORAGE_KEYS.defaultBaseBranch, JSON.stringify(settings.defaultBaseBranch)),
    LocalStorage.setItem(STORAGE_KEYS.assignedToMe, JSON.stringify(settings.assignedToMe)),
    LocalStorage.setItem(STORAGE_KEYS.onboarded, JSON.stringify(true)),
  ]);
}
