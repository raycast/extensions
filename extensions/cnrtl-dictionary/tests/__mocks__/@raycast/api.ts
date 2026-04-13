/**
 * Mock for @raycast/api used during Jest tests.
 * Implements the subset of the API that our code actually calls.
 */

// ── Storage ───────────────────────────────────────────────────────────────────

const _storage: Map<string, string> = new Map();

export const LocalStorage = {
  getItem: jest.fn(async (key: string) => _storage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { _storage.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { _storage.delete(key); }),
  clear: jest.fn(async () => { _storage.clear(); }),
  allItems: jest.fn(async () => Object.fromEntries(_storage)),
  _reset: () => _storage.clear(),
};

// ── Toast ─────────────────────────────────────────────────────────────────────

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const showToast = jest.fn();

// ── Cache ─────────────────────────────────────────────────────────────────────

const _cache: Map<string, string> = new Map();

export class Cache {
  get(key: string): string | undefined { return _cache.get(key); }
  set(key: string, value: string): void { _cache.set(key, value); }
  remove(key: string): void { _cache.delete(key); }
  has(key: string): boolean { return _cache.has(key); }
  clear(): void { _cache.clear(); }
}

// ── Navigation ────────────────────────────────────────────────────────────────

export const useNavigation = jest.fn(() => ({
  push: jest.fn(),
  pop: jest.fn(),
}));

// ── Preferences ───────────────────────────────────────────────────────────────

export const getPreferenceValues = jest.fn(() => ({
  historySize: "50",
  openBrowserOnSubmit: false,
}));

export const openExtensionPreferences = jest.fn();

// ── React components (stubbed) ────────────────────────────────────────────────

const React = require("react");

export const List = Object.assign(
  ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children),
  {
    Item: Object.assign(
      ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children),
      {
        Detail: Object.assign(
          ({ children }: { children?: React.ReactNode }) =>
            React.createElement("div", null, children),
          {
            Metadata: Object.assign(
              ({ children }: { children?: React.ReactNode }) =>
                React.createElement("div", null, children),
              {
                Label: () => React.createElement("span"),
                Link: () => React.createElement("a"),
                Separator: () => React.createElement("hr"),
                TagList: Object.assign(
                  ({ children }: { children?: React.ReactNode }) =>
                    React.createElement("div", null, children),
                  { Item: () => React.createElement("span") }
                ),
              }
            ),
          }
        ),
      }
    ),
    Section: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", null, children),
    EmptyView: () => React.createElement("div"),
  }
);

export const Detail = Object.assign(
  ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  {
    Metadata: Object.assign(
      ({ children }: { children?: React.ReactNode }) =>
        React.createElement("div", null, children),
      {
        Label: () => React.createElement("span"),
        Link: () => React.createElement("a"),
        Separator: () => React.createElement("hr"),
        TagList: Object.assign(
          ({ children }: { children?: React.ReactNode }) =>
            React.createElement("div", null, children),
          { Item: () => React.createElement("span") }
        ),
      }
    ),
  }
);

export const Action = Object.assign(
  ({ onAction }: { onAction?: () => void }) => React.createElement("button", { onClick: onAction }),
  {
    OpenInBrowser: () => React.createElement("button"),
    CopyToClipboard: () => React.createElement("button"),
    Push: () => React.createElement("button"),
  }
);

export const ActionPanel = Object.assign(
  ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  {
    Section: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", null, children),
  }
);

export const Form = Object.assign(
  ({ children }: { children?: React.ReactNode }) =>
    React.createElement("form", null, children),
  {
    TextField: () => React.createElement("input"),
    Checkbox: () => React.createElement("input"),
    Separator: () => React.createElement("hr"),
  }
);

// ── Icons ─────────────────────────────────────────────────────────────────────

export const Icon = new Proxy(
  {},
  { get: (_target, prop) => String(prop) }
) as Record<string, string>;

// ── Color ─────────────────────────────────────────────────────────────────────

export const Color = {
  Blue: "blue",
  Green: "green",
  Red: "red",
  Orange: "orange",
  Yellow: "yellow",
  Purple: "purple",
  PrimaryText: "primary",
  SecondaryText: "secondary",
};

// ── Clipboard ─────────────────────────────────────────────────────────────────

export const Clipboard = {
  copy: jest.fn(),
  paste: jest.fn(),
  readText: jest.fn().mockResolvedValue(""),
};

// ── Environment ───────────────────────────────────────────────────────────────

export const environment = {
  commandName: "test",
  extensionName: "cnrtl-dictionary",
  isDevelopment: true,
  raycastVersion: "1.88.0",
  textSize: "medium",
  theme: "light",
  launchContext: {},
};
