import { DefaultActionPreferenceStore } from "../stores/default-action-preference-store";

class MemoryCache {
  private values = new Map<string, string>();

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

class MemoryStorage {
  private values = new Map<string, string | number | boolean>();

  constructor(initialValues: Record<string, string | number | boolean> = {}) {
    Object.entries(initialValues).forEach(([key, value]) => {
      this.values.set(key, value);
    });
  }

  async getItem<T extends string | number | boolean>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async setItem(key: string, value: string | number | boolean): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

describe("DefaultActionPreferenceStore", () => {
  it("hydrates the selected action from LocalStorage into the synchronous cache", async () => {
    const cache = new MemoryCache();
    const storage = new MemoryStorage({
      lastSelectedAction: "script_Raycast Claude",
    });
    const store = new DefaultActionPreferenceStore(cache, storage);

    expect(store.getDefaultActionPreference()).toBeUndefined();

    await store.hydrate();

    expect(store.getDefaultActionPreference()).toBe("script_Raycast Claude");
    expect(store.isHydrated()).toBe(true);
  });

  it("keeps cache writes available synchronously and persists them", async () => {
    const cache = new MemoryCache();
    const storage = new MemoryStorage();
    const store = new DefaultActionPreferenceStore(cache, storage);

    await store.saveDefaultActionPreference("paste");

    expect(store.getDefaultActionPreference()).toBe("paste");
    await expect(storage.getItem("lastSelectedAction")).resolves.toBe("paste");
  });

  it("hydrates last-used action history from LocalStorage", async () => {
    const cache = new MemoryCache();
    const storage = new MemoryStorage({
      actionExecutionHistory: JSON.stringify(["script_Raycast Claude", "script_Raycast Claude", "script_Other"]),
    });
    const store = new DefaultActionPreferenceStore(cache, storage);

    await store.hydrate();

    expect(store.getLastExecutedAction()).toBe("script_Raycast Claude");
  });

  it("does not let a slow hydration overwrite a newer user selection", async () => {
    const cache = new MemoryCache();
    const storage = new MemoryStorage({
      lastSelectedAction: "copyToClipboard",
    });
    const store = new DefaultActionPreferenceStore(cache, storage);
    const hydration = store.hydrate();

    await store.saveDefaultActionPreference("paste");
    await hydration;

    expect(store.getDefaultActionPreference()).toBe("paste");
    await expect(storage.getItem("lastSelectedAction")).resolves.toBe("paste");
  });
});
