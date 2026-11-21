// Minimal stand-in for `@raycast/api` in unit tests. Extend it only as far as tests need.

const store = new Map<string, string>();

export const LocalStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    return store.get(key) as T | undefined;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async clear(): Promise<void> {
    store.clear();
  },
};

export class Cache {
  private readonly entries = new Map<string, string>();

  get(key: string): string | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: string): void {
    this.entries.set(key, value);
  }

  remove(key: string): boolean {
    return this.entries.delete(key);
  }
}

export const Clipboard = {
  copy: async (_content: string, _options?: { concealed?: boolean }): Promise<void> => undefined,
  paste: async (_content: string): Promise<void> => undefined,
  readText: async (_options?: { offset?: number }): Promise<string | undefined> => undefined,
};

export const environment = { canAccess: (_api: unknown): boolean => true };

export const BrowserExtension = {
  getContent: async (_options: { format?: string; cssSelector?: string }): Promise<string> => "",
};

export const LaunchType = { UserInitiated: "userInitiated", Background: "background" };

export const showHUD = async (_title: string): Promise<void> => undefined;
export const launchCommand = async (_options: unknown): Promise<void> => undefined;
export const getSelectedText = async (): Promise<string> => "";
export const getFrontmostApplication = async (): Promise<{ bundleId?: string; path: string }> => ({
  bundleId: "app.source",
  path: "/Applications/Source.app",
});
export const getPreferenceValues = <T>(): T => ({}) as T;
