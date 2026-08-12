/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
/**
 * Mock for @raycast/api module.
 *
 * Provides lightweight stubs for Raycast APIs used across the codebase
 * so that service-layer and utility tests can run in a plain Node/Jest
 * environment without the real Raycast runtime.
 *
 * Only the APIs actually imported by non-UI code need to be mocked here.
 * UI components (React/JSX) are not tested via Jest in this project —
 * they are validated through Raycast dev mode hot-reload instead.
 */

// ──────────────────────────────────────────
// Cache
// ──────────────────────────────────────────

/**
 * In-memory Cache implementation that mirrors the Raycast Cache API.
 * Stores data in a plain Map — no disk persistence, no LRU eviction.
 * Sufficient for unit / integration tests.
 */
export class Cache {
  private store = new Map<string, string>();
  private subscribers: Array<(key: string | undefined, data: string | undefined) => void> = [];

  constructor(_options?: { capacity?: number; namespace?: string }) {
    // Options are accepted but ignored in the mock
  }

  get isEmpty(): boolean {
    return this.store.size === 0;
  }

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  set(key: string, data: string): void {
    this.store.set(key, data);
    this.notifySubscribers(key, data);
  }

  remove(key: string): boolean {
    const existed = this.store.has(key);
    this.store.delete(key);
    if (existed) {
      this.notifySubscribers(key, undefined);
    }
    return existed;
  }

  clear(options?: { notifySubscribers?: boolean }): void {
    this.store.clear();
    if (options?.notifySubscribers !== false) {
      this.notifySubscribers(undefined, undefined);
    }
  }

  subscribe(subscriber: (key: string | undefined, data: string | undefined) => void): () => void {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== subscriber);
    };
  }

  private notifySubscribers(key: string | undefined, data: string | undefined): void {
    for (const subscriber of this.subscribers) {
      subscriber(key, data);
    }
  }
}

// ──────────────────────────────────────────
// LocalStorage
// ──────────────────────────────────────────

/**
 * In-memory LocalStorage mock.
 * All methods are async to match the real Raycast LocalStorage API.
 */
const localStorageStore = new Map<string, string | number | boolean>();

export const LocalStorage = {
  async getItem<T extends string | number | boolean = string>(key: string): Promise<T | undefined> {
    return localStorageStore.get(key) as T | undefined;
  },

  async setItem(key: string, value: string | number | boolean): Promise<void> {
    localStorageStore.set(key, value);
  },

  async removeItem(key: string): Promise<void> {
    localStorageStore.delete(key);
  },

  async allItems(): Promise<Record<string, string | number | boolean>> {
    const result: Record<string, string | number | boolean> = {};
    for (const [k, v] of localStorageStore.entries()) {
      result[k] = v;
    }
    return result;
  },

  async clear(): Promise<void> {
    localStorageStore.clear();
  },

  /** Test helper — reset storage between tests */
  _reset(): void {
    localStorageStore.clear();
  },
};

// ──────────────────────────────────────────
// Toast
// ──────────────────────────────────────────

export const Toast = {
  Style: {
    Animated: "animated" as const,
    Success: "success" as const,
    Failure: "failure" as const,
  },
};

export async function showToast(_options: {
  style?: string;
  title: string;
  message?: string;
}): Promise<{ hide: () => void }> {
  // Silent in tests — no toast UI to render
  return { hide: () => {} };
}

// ──────────────────────────────────────────
// Preferences
// ──────────────────────────────────────────

/**
 * Mock preferences store. Tests can override values by calling
 * `_setMockPreferences({ baseCurrency: "USD" })` before running.
 */
let mockPreferences: Record<string, unknown> = {
  baseCurrency: "GBP",
};

export function getPreferenceValues<T extends Record<string, unknown>>(): T {
  return mockPreferences as T;
}

/** Test helper — set mock preferences before a test */
export function _setMockPreferences(prefs: Record<string, unknown>): void {
  mockPreferences = { ...mockPreferences, ...prefs };
}

// ──────────────────────────────────────────
// Command Metadata
// ──────────────────────────────────────────

export async function updateCommandMetadata(_metadata: { subtitle?: string }): Promise<void> {
  // No-op in tests
}

// ──────────────────────────────────────────
// Navigation (no-op stubs)
// ──────────────────────────────────────────

export function useNavigation() {
  return {
    push: () => {},
    pop: () => {},
  };
}

// ──────────────────────────────────────────
// Alerts
// ──────────────────────────────────────────

export const Alert = {
  ActionStyle: {
    Default: "default" as const,
    Destructive: "destructive" as const,
    Cancel: "cancel" as const,
  },
};

export async function confirmAlert(_options: {
  title: string;
  message?: string;
  icon?: unknown;
  primaryAction?: { title: string; style?: string };
  dismissAction?: { title: string };
}): Promise<boolean> {
  // Default to confirmed in tests
  return true;
}

// ──────────────────────────────────────────
// Environment
// ──────────────────────────────────────────

export const environment = {
  commandName: "portfolio",
  extensionName: "portfolio-tracker",
  isDevelopment: true,
  appearance: "dark",
  supportPath: "/tmp/raycast-portfolio-tracker-test",
  assetsPath: "/tmp/raycast-portfolio-tracker-test/assets",
};

// ──────────────────────────────────────────
// UI Components (no-op stubs for type safety)
// ──────────────────────────────────────────

export const Icon = new Proxy(
  {},
  {
    get(_target, prop) {
      return String(prop);
    },
  },
) as Record<string, string>;

export const Color = {
  Blue: "#007AFF",
  Green: "#30D158",
  Orange: "#FF9F0A",
  Red: "#FF453A",
  Purple: "#BF5AF2",
  Yellow: "#FFD60A",
  Magenta: "#FF2D55",
  PrimaryText: "#FFFFFF",
  SecondaryText: "#8E8E93",
};

// Stub React component factories — these are never actually rendered in tests
// but may be imported by modules that mix logic and types.

function createComponentStub(name: string): any {
  const stub = () => null;
  stub.displayName = name;
  return stub;
}

export const List = Object.assign(createComponentStub("List"), {
  Item: Object.assign(createComponentStub("List.Item"), {
    Detail: Object.assign(createComponentStub("List.Item.Detail"), {
      Metadata: Object.assign(createComponentStub("List.Item.Detail.Metadata"), {
        Label: createComponentStub("List.Item.Detail.Metadata.Label"),
        Link: createComponentStub("List.Item.Detail.Metadata.Link"),
        TagList: Object.assign(createComponentStub("List.Item.Detail.Metadata.TagList"), {
          Item: createComponentStub("List.Item.Detail.Metadata.TagList.Item"),
        }),
        Separator: createComponentStub("List.Item.Detail.Metadata.Separator"),
      }),
    }),
  }),
  Section: createComponentStub("List.Section"),
  Dropdown: Object.assign(createComponentStub("List.Dropdown"), {
    Item: createComponentStub("List.Dropdown.Item"),
    Section: createComponentStub("List.Dropdown.Section"),
  }),
  EmptyView: createComponentStub("List.EmptyView"),
});

export const Detail = Object.assign(createComponentStub("Detail"), {
  Metadata: Object.assign(createComponentStub("Detail.Metadata"), {
    Label: createComponentStub("Detail.Metadata.Label"),
    Link: createComponentStub("Detail.Metadata.Link"),
    TagList: Object.assign(createComponentStub("Detail.Metadata.TagList"), {
      Item: createComponentStub("Detail.Metadata.TagList.Item"),
    }),
    Separator: createComponentStub("Detail.Metadata.Separator"),
  }),
});

export const Form = Object.assign(createComponentStub("Form"), {
  TextField: createComponentStub("Form.TextField"),
  Dropdown: Object.assign(createComponentStub("Form.Dropdown"), {
    Item: createComponentStub("Form.Dropdown.Item"),
  }),
  Description: createComponentStub("Form.Description"),
  Separator: createComponentStub("Form.Separator"),
});

export const ActionPanel = Object.assign(createComponentStub("ActionPanel"), {
  Section: createComponentStub("ActionPanel.Section"),
});

export const Action = Object.assign(createComponentStub("Action"), {
  SubmitForm: createComponentStub("Action.SubmitForm"),
  CopyToClipboard: createComponentStub("Action.CopyToClipboard"),
  OpenInBrowser: createComponentStub("Action.OpenInBrowser"),
  Style: {
    Default: "default" as const,
    Destructive: "destructive" as const,
  },
});

export const MenuBarExtra = Object.assign(createComponentStub("MenuBarExtra"), {
  Item: createComponentStub("MenuBarExtra.Item"),
  Submenu: createComponentStub("MenuBarExtra.Submenu"),
  Section: createComponentStub("MenuBarExtra.Section"),
});
