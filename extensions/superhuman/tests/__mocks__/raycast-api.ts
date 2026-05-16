/**
 * Stub for @raycast/api in unit tests. Only the pieces the unit tests touch
 * are stubbed; UI components are out of scope.
 */

let readOnlyOverride = false;

export const getPreferenceValues = () => ({
  enableDraftPreviews: true,
  readOnlyMode: readOnlyOverride,
});

export const environment = { assetsPath: "" };

const _store = new Map<string, string>();
export const LocalStorage = {
  getItem: async <T = string>(key: string): Promise<T | undefined> => {
    const v = _store.get(key);
    return v as unknown as T | undefined;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    _store.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    _store.delete(key);
  },
  clear: async (): Promise<void> => {
    _store.clear();
  },
};

export function __resetLocalStorage(): void {
  _store.clear();
}

export function __setReadOnly(value: boolean): void {
  readOnlyOverride = value;
}
