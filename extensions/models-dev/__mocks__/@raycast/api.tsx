/**
 * Lightweight stubs for @raycast/api used in automated validation scripts.
 * Each Raycast component is replaced with a plain React element so the
 * component tree can be rendered with react-dom/server without the native
 * macOS bridge.
 */

import React from "react";

const noop = () => {};

// ── List ─────────────────────────────────────────────────────────────────────

const ListDropdown = Object.assign(
  ({ children }: { children?: React.ReactNode; [k: string]: unknown }) => (
    <div data-raycast="List.Dropdown">{children}</div>
  ),
  {
    Item: (_props: { [k: string]: unknown }) => null,
    Section: ({ children }: { children?: React.ReactNode; [k: string]: unknown }) => (
      <div data-raycast="List.Dropdown.Section">{children}</div>
    ),
  },
);

const ListSection = ({ title, children }: { title?: string; children?: React.ReactNode }) => (
  <div data-raycast="List.Section" data-title={title}>
    {children}
  </div>
);

const ListItem = ({ title, actions }: { title?: string; actions?: React.ReactNode; [k: string]: unknown }) => (
  <div data-raycast="List.Item" data-title={title}>
    {actions}
  </div>
);

const ListEmptyView = (_props: { [k: string]: unknown }) => null;

const List = Object.assign(
  ({ children }: { children?: React.ReactNode; [k: string]: unknown }) => <div data-raycast="List">{children}</div>,
  {
    Item: ListItem,
    Section: ListSection,
    EmptyView: ListEmptyView,
    Dropdown: ListDropdown,
  },
);

// ── ActionPanel ───────────────────────────────────────────────────────────────

const ActionPanelSection = ({ children }: { children?: React.ReactNode; [k: string]: unknown }) => (
  <div data-raycast="ActionPanel.Section">{children}</div>
);

const ActionPanel = Object.assign(
  ({ children }: { children?: React.ReactNode }) => <div data-raycast="ActionPanel">{children}</div>,
  { Section: ActionPanelSection },
);

// ── Action ────────────────────────────────────────────────────────────────────

const Action = Object.assign(
  ({ title }: { title?: string; [k: string]: unknown }) => <button data-raycast="Action">{title}</button>,
  {
    CopyToClipboard: ({ title }: { title?: string; [k: string]: unknown }) => (
      <button data-raycast="Action.CopyToClipboard">{title}</button>
    ),
    OpenInBrowser: ({ title }: { title?: string; [k: string]: unknown }) => (
      <button data-raycast="Action.OpenInBrowser">{title}</button>
    ),
    Push: ({ title }: { title?: string; [k: string]: unknown }) => <button data-raycast="Action.Push">{title}</button>,
  },
);

// ── Detail ────────────────────────────────────────────────────────────────────

const DetailMetadata = Object.assign(
  ({ children }: { children?: React.ReactNode }) => <div data-raycast="Detail.Metadata">{children}</div>,
  {
    Label: (_props: { [k: string]: unknown }) => null,
    Link: (_props: { [k: string]: unknown }) => null,
    TagList: Object.assign(({ children }: { children?: React.ReactNode }) => <div>{children}</div>, {
      Item: (_props: { [k: string]: unknown }) => null,
    }),
    Separator: () => null,
  },
);

const Detail = Object.assign(
  ({ markdown }: { markdown?: string; [k: string]: unknown }) => <div data-raycast="Detail">{markdown}</div>,
  { Metadata: DetailMetadata },
);

// ── Icon / Color ──────────────────────────────────────────────────────────────

const Icon = new Proxy({} as Record<string, string>, {
  get: (_, key: string) => `icon:${key}`,
}) as Record<string, string>;

const Color = new Proxy({} as Record<string, string>, {
  get: (_, key: string) => `color:${key}`,
}) as Record<string, string>;

// ── Hooks ─────────────────────────────────────────────────────────────────────

const useNavigation = () => ({ push: noop, pop: noop });

// ── Utilities ─────────────────────────────────────────────────────────────────

const Clipboard = { copy: noop, paste: async () => "" };

const Toast = { Style: { Success: "success", Failure: "failure", Animated: "animated" } };
const showToast = async (_opts: unknown) => {};

const Cache = class {
  get() {
    return undefined;
  }
  set() {}
  remove() {}
};

const LocalStorage = {
  getItem: async () => undefined,
  setItem: async () => {},
  removeItem: async () => {},
  allItems: async () => ({}),
  clear: async () => {},
};

const environment = {
  assetsPath: "/tmp/assets",
  commandName: "test",
  extensionName: "test",
  isDevelopment: true,
  launchType: "userInitiated",
  raycastVersion: "1.0.0",
  supportPath: "/tmp/support",
  textSize: "medium",
  theme: "dark",
};

const getPreferenceValues = () => ({ enableBackgroundSync: false });

export {
  List,
  ActionPanel,
  Action,
  Detail,
  Icon,
  Color,
  useNavigation,
  Clipboard,
  Toast,
  showToast,
  Cache,
  LocalStorage,
  environment,
  getPreferenceValues,
};
