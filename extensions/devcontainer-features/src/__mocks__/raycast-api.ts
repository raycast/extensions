// Mock for @raycast/api in tests

export class Cache {
  private store = new Map<string, string>();

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const LocalStorage = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getItem: async <T>(key: string): Promise<T | undefined> => undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setItem: async (key: string, value: string): Promise<void> => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeItem: async (key: string): Promise<void> => {},
  clear: async (): Promise<void> => {},
  allItems: async (): Promise<Record<string, string>> => ({}),
};

export function getPreferenceValues<T>(): T {
  return {
    githubToken: "",
    cacheTtlHours: "24",
    concurrency: "10",
  } as T;
}

export const showToast = async () => {};

export const Toast = {
  Style: {
    Animated: "Animated",
    Success: "Success",
    Failure: "Failure",
  },
};

export const Icon = {
  Eye: "Eye",
  ArrowClockwise: "ArrowClockwise",
  Warning: "Warning",
  ExclamationMark: "ExclamationMark",
  Download: "Download",
  List: "List",
  Star: "Star",
  StarDisabled: "StarDisabled",
};
