/**
 * Mock for @raycast/api
 *
 * Provides minimal stubs for all Raycast API components and functions
 * used by the renaming extension.
 */

import React from "react";
import { vi } from "vitest";

// --- Enums & Constants ---

export const Icon = {
  Image: "image",
  Video: "video",
  Music: "music",
  Document: "document",
  Box: "box",
  Code: "code",
  Text: "text",
  Terminal: "terminal",
  Plus: "plus",
  Play: "play",
  SaveDocument: "save-document",
  Trash: "trash",
  ArrowClockwise: "arrow-clockwise",
  Clipboard: "clipboard",
  Finder: "finder",
  MagnifyingGlass: "magnifying-glass",
  Checkmark: "checkmark",
  XMarkCircle: "x-mark-circle",
} as const;

export const Color = {
  Purple: "purple",
  Red: "red",
  Orange: "orange",
  Yellow: "yellow",
  Green: "green",
  Blue: "blue",
  SecondaryText: "secondary-text",
  PrimaryText: "primary-text",
} as const;

export const Toast = {
  Style: {
    Success: "success" as const,
    Failure: "failure" as const,
    Animated: "animated" as const,
  },
};

export const Alert = {
  ActionStyle: {
    Destructive: "destructive" as const,
    Default: "default" as const,
  },
};

export const Keyboard = {
  Shortcut: {
    Common: {
      New: { key: "n", modifiers: ["cmd"] } as const,
    },
  },
};

// --- Functions ---

export const showToast = vi.fn().mockResolvedValue(undefined);
export const popToRoot = vi.fn().mockResolvedValue(undefined);
export const confirmAlert = vi.fn().mockResolvedValue(true);
export const trash = vi.fn().mockResolvedValue(undefined);
export const open = vi.fn().mockResolvedValue(undefined);
export const showHUD = vi.fn().mockResolvedValue(undefined);

export const getPreferenceValues = vi.fn(() => ({}));
export const getSelectedFinderItems = vi.fn().mockResolvedValue([]);

export const useNavigation = vi.fn(() => ({
  pop: vi.fn(),
  push: vi.fn(),
}));

// --- Storage ---

export const LocalStorage = {
  getItem: vi.fn().mockResolvedValue(null),
  setItem: vi.fn().mockResolvedValue(undefined),
  removeItem: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  allItems: vi.fn().mockResolvedValue({}),
};

export const Clipboard = {
  copy: vi.fn().mockResolvedValue(undefined),
  paste: vi.fn().mockResolvedValue(""),
  read: vi.fn().mockResolvedValue(""),
  readText: vi.fn().mockResolvedValue(""),
};

// --- AI ---

export const AI = {
  ask: vi.fn().mockResolvedValue("suggested_name"),
  Model: {
    "OpenAI_GPT4o-mini": "openai-gpt4o-mini",
  },
};

export const environment = {
  canAccess: vi.fn().mockReturnValue(true),
  supportPath: "/tmp/raycast-test",
  assetsPath: "/tmp/raycast-test/assets",
};

// --- React Components (minimal stubs) ---

const FormTextField = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "form-text-field" }, children);

const FormDropdown = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "form-dropdown" }, children);

const FormDropdownItem = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "form-dropdown-item" }, children);

const FormCheckbox = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "form-checkbox" }, children);

const FormSeparator = () => React.createElement("hr", { "data-testid": "form-separator" });

const FormDescription = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "form-description" }, children);

const FormComponent = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("form", { "data-testid": "form" }, children);

export const Form = Object.assign(FormComponent, {
  TextField: FormTextField,
  Dropdown: Object.assign(FormDropdown, { Item: FormDropdownItem }),
  Checkbox: FormCheckbox,
  Separator: FormSeparator,
  Description: FormDescription,
});

const ListComponent = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "list" }, children);

const ListItem = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "list-item" }, children);

const ListEmptyView = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "list-empty-view" }, children);

const ListSection = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "list-section" }, children);

export const List = Object.assign(ListComponent, {
  Item: ListItem,
  EmptyView: ListEmptyView,
  Section: ListSection,
});

const DetailComponent = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "detail" }, children);

const DetailMetadata = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "detail-metadata" }, children);

const DetailMetadataLabel = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "detail-metadata-label" }, children);

const DetailMetadataSeparator = () => React.createElement("hr", { "data-testid": "detail-metadata-separator" });

const DetailMetadataLink = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "detail-metadata-link" }, children);

export const Detail = Object.assign(DetailComponent, {
  Metadata: Object.assign(DetailMetadata, {
    Label: DetailMetadataLabel,
    Separator: DetailMetadataSeparator,
    Link: DetailMetadataLink,
  }),
});

const ActionPanelComponent = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "action-panel" }, children);

const ActionPanelSection = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "action-panel-section" }, children);

export const ActionPanel = Object.assign(ActionPanelComponent, {
  Section: ActionPanelSection,
});

export const Action = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "action" }, children);
