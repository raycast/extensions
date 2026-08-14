const localStorageState = new Map<string, string | number | boolean>();
const cacheState = new Map<string, string>();

export const getPreferenceValues = jest.fn(() => ({}));
export const environment = { commandName: "prompt-lab" };

export const LocalStorage = {
  getItem: jest.fn(async (key: string) => localStorageState.get(key)),
  setItem: jest.fn(async (key: string, value: string | number | boolean) => {
    localStorageState.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    localStorageState.delete(key);
  }),
  clear: jest.fn(async () => {
    localStorageState.clear();
  }),
  allItems: jest.fn(async () => Object.fromEntries(localStorageState.entries())),
};

export class Cache {
  private readonly namespace: string;

  constructor(options?: { namespace?: string }) {
    this.namespace = options?.namespace ?? "__default__";
  }

  private storageKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  has(key: string): boolean {
    return cacheState.has(this.storageKey(key));
  }

  get(key: string): string | undefined {
    return cacheState.get(this.storageKey(key));
  }

  set(key: string, value: string): void {
    cacheState.set(this.storageKey(key), value);
  }

  remove(key: string): void {
    cacheState.delete(this.storageKey(key));
  }

  clear(): void {
    const prefix = `${this.namespace}:`;
    for (const key of cacheState.keys()) {
      if (key.startsWith(prefix)) {
        cacheState.delete(key);
      }
    }
  }
}
