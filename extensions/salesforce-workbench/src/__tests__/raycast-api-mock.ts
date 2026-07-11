const storage = new Map<string, string | number | boolean>();
const cacheStorage = new Map<string, string>();

export class Cache {
  get(key: string): string | undefined {
    return cacheStorage.get(key);
  }

  set(key: string, value: string): void {
    cacheStorage.set(key, value);
  }

  remove(key: string): boolean {
    return cacheStorage.delete(key);
  }

  clear(): void {
    cacheStorage.clear();
  }
}

export const LocalStorage = {
  getItem: async <T>(key: string): Promise<T | undefined> => storage.get(key) as T | undefined,
  setItem: async (key: string, value: string | number | boolean): Promise<void> => {
    storage.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    storage.delete(key);
  },
  allItems: async (): Promise<Record<string, string | number | boolean>> => Object.fromEntries(storage),
  clear: async (): Promise<void> => storage.clear(),
};

export function getPreferenceValues<T>(): T {
  return {
    sfBinaryPath: "/usr/local/bin/sf",
    exportDirectory: "/tmp",
    historyDays: "30",
    historyLimit: "100",
    additionalObjects: "",
    preferredBrowser: "default",
  } as T;
}

export const Action = {};
export const ActionPanel = {};
export const Alert = { ActionStyle: { Destructive: "destructive" } };
export const Color = {};
export const Detail = {};
export const Form = { DatePicker: { Type: { Date: "date", DateTime: "datetime" } } };
export const Icon = {};
export const List = {};
export const Toast = { Style: { Animated: "animated", Success: "success", Failure: "failure" } };
export const confirmAlert = async () => true;
export const openExtensionPreferences = async () => undefined;
export const popToRoot = async () => undefined;
export const showInFinder = async () => undefined;
export const showToast = async () => ({ style: "", title: "", message: "" });
export const useNavigation = () => ({ push: () => undefined, pop: () => undefined });
