/**
 * Mock implementation of @raycast/api for testing.
 * This module provides mock implementations of commonly used Raycast APIs.
 */

import { vi } from "vitest";
import React from "react";

// Helper to create mock React components
const createMockComponent = (name: string) => {
  const component = ({ children, ...props }: { children?: React.ReactNode }) => {
    return React.createElement("div", { "data-testid": name, ...props }, children);
  };
  component.displayName = name;
  return component;
};

// Preferences mock
export const getPreferenceValues = vi.fn(() => ({
  apiKey: "test-api-key",
  environment: "sandbox",
  locale: "en-US",
}));

// LocalStorage mock
export const LocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  allItems: vi.fn(() => Promise.resolve({})),
};

// Toast mock
export const showToast = vi.fn(() => Promise.resolve());
export const Toast = {
  Style: {
    Animated: "animated",
    Success: "success",
    Failure: "failure",
  },
};

// Alert mock
export const confirmAlert = vi.fn(() => Promise.resolve(true));
export const Alert = {
  ActionStyle: {
    Default: "default",
    Destructive: "destructive",
    Cancel: "cancel",
  },
};

// Clipboard mock
export const Clipboard = {
  copy: vi.fn(() => Promise.resolve()),
  paste: vi.fn(() => Promise.resolve("")),
  readText: vi.fn(() => Promise.resolve("")),
};

// Icon enum mock
export const Icon = {
  Checkmark: "checkmark",
  XMarkCircle: "xmark-circle",
  Clock: "clock",
  QuestionMark: "question-mark",
  CreditCard: "credit-card",
  Building: "building",
  ArrowDown: "arrow-down",
  ArrowUp: "arrow-up",
  Coins: "coins",
  TwoPeople: "two-people",
  Globe: "globe",
  BankNote: "bank-note",
  Desktop: "desktop",
  Airplane: "airplane",
  Leaf: "leaf",
  Car: "car",
  Cart: "cart",
  Star: "star",
  Heart: "heart",
  House: "house",
  LightBulb: "light-bulb",
  Tag: "tag",
  Person: "person",
  Lock: "lock",
  Key: "key",
  Circle: "circle",
  CircleFilled: "circle-filled",
  Plus: "plus",
  Minus: "minus",
  Trash: "trash",
  Pencil: "pencil",
  Eye: "eye",
  EyeSlash: "eye-slash",
  Document: "document",
  Folder: "folder",
  Calendar: "calendar",
  Bell: "bell",
  Link: "link",
  Filter: "filter",
  MagnifyingGlass: "magnifying-glass",
  Gear: "gear",
  Info: "info",
  Warning: "warning",
  ExclamationMark: "exclamation-mark",
};

// Color enum mock
export const Color = {
  Green: "green",
  Red: "red",
  Yellow: "yellow",
  Orange: "orange",
  Blue: "blue",
  Purple: "purple",
  Magenta: "magenta",
  PrimaryText: "primary-text",
  SecondaryText: "secondary-text",
};

// Navigation mock
export const useNavigation = vi.fn(() => ({
  push: vi.fn(),
  pop: vi.fn(),
}));

// Open mock
export const open = vi.fn(() => Promise.resolve());
export const openExtensionPreferences = vi.fn(() => Promise.resolve());

// Environment mock
export const environment = {
  assetsPath: "/mock/assets",
  supportPath: "/mock/support",
  extensionName: "bunq",
  commandName: "bunq",
  isDevelopment: true,
};

// Keyboard mock
export const Keyboard = {
  Shortcut: {
    Common: {
      Copy: { modifiers: ["cmd"], key: "c" },
      Paste: { modifiers: ["cmd"], key: "v" },
      Cut: { modifiers: ["cmd"], key: "x" },
    },
  },
};

// showHUD mock
export const showHUD = vi.fn(() => Promise.resolve());

// popToRoot mock
export const popToRoot = vi.fn(() => Promise.resolve());

// launchCommand mock
export const launchCommand = vi.fn(() => Promise.resolve());

// ============== React Component Mocks ==============

// List Component
const ListComponent = createMockComponent("List");
const ListItem = createMockComponent("List.Item");
const ListSection = createMockComponent("List.Section");
const ListEmptyView = createMockComponent("List.EmptyView");
const ListDropdown = createMockComponent("List.Dropdown");
const ListDropdownItem = createMockComponent("List.Dropdown.Item");
const ListDropdownSection = createMockComponent("List.Dropdown.Section");

export const List = Object.assign(ListComponent, {
  Item: ListItem,
  Section: ListSection,
  EmptyView: ListEmptyView,
  Dropdown: Object.assign(ListDropdown, {
    Item: ListDropdownItem,
    Section: ListDropdownSection,
  }),
});

// Form Component
const FormComponent = createMockComponent("Form");
const FormTextField = createMockComponent("Form.TextField");
const FormPasswordField = createMockComponent("Form.PasswordField");
const FormTextArea = createMockComponent("Form.TextArea");
const FormDropdown = createMockComponent("Form.Dropdown");
const FormDropdownItem = createMockComponent("Form.Dropdown.Item");
const FormDropdownSection = createMockComponent("Form.Dropdown.Section");
const FormCheckbox = createMockComponent("Form.Checkbox");
const FormDatePicker = createMockComponent("Form.DatePicker");
const FormTagPicker = createMockComponent("Form.TagPicker");
const FormTagPickerItem = createMockComponent("Form.TagPicker.Item");
const FormSeparator = createMockComponent("Form.Separator");
const FormDescription = createMockComponent("Form.Description");
const FormFilePicker = createMockComponent("Form.FilePicker");
const FormLink = createMockComponent("Form.Link");

export const Form = Object.assign(FormComponent, {
  TextField: FormTextField,
  PasswordField: FormPasswordField,
  TextArea: FormTextArea,
  Dropdown: Object.assign(FormDropdown, {
    Item: FormDropdownItem,
    Section: FormDropdownSection,
  }),
  Checkbox: FormCheckbox,
  DatePicker: FormDatePicker,
  TagPicker: Object.assign(FormTagPicker, {
    Item: FormTagPickerItem,
  }),
  Separator: FormSeparator,
  Description: FormDescription,
  FilePicker: FormFilePicker,
  Link: FormLink,
});

// Action Component
const ActionComponent = createMockComponent("Action");
const ActionCopyToClipboard = createMockComponent("Action.CopyToClipboard");
const ActionOpenInBrowser = createMockComponent("Action.OpenInBrowser");
const ActionPaste = createMockComponent("Action.Paste");
const ActionPush = createMockComponent("Action.Push");
const ActionSubmitForm = createMockComponent("Action.SubmitForm");
const ActionTrash = createMockComponent("Action.Trash");
const ActionShowInFinder = createMockComponent("Action.ShowInFinder");
const ActionOpen = createMockComponent("Action.Open");
const ActionPickDate = createMockComponent("Action.PickDate");

export const Action = Object.assign(ActionComponent, {
  Style: {
    Regular: "regular",
    Destructive: "destructive",
  },
  CopyToClipboard: ActionCopyToClipboard,
  OpenInBrowser: ActionOpenInBrowser,
  Paste: ActionPaste,
  Push: ActionPush,
  SubmitForm: ActionSubmitForm,
  Trash: ActionTrash,
  ShowInFinder: ActionShowInFinder,
  Open: ActionOpen,
  PickDate: ActionPickDate,
});

// ActionPanel Component
const ActionPanelComponent = createMockComponent("ActionPanel");
const ActionPanelSection = createMockComponent("ActionPanel.Section");
const ActionPanelSubmenu = createMockComponent("ActionPanel.Submenu");

export const ActionPanel = Object.assign(ActionPanelComponent, {
  Section: ActionPanelSection,
  Submenu: ActionPanelSubmenu,
});

// Detail Component
const DetailComponent = createMockComponent("Detail");
const DetailMetadata = createMockComponent("Detail.Metadata");
const DetailMetadataLabel = createMockComponent("Detail.Metadata.Label");
const DetailMetadataTagList = createMockComponent("Detail.Metadata.TagList");
const DetailMetadataTagListItem = createMockComponent("Detail.Metadata.TagList.Item");
const DetailMetadataLink = createMockComponent("Detail.Metadata.Link");
const DetailMetadataSeparator = createMockComponent("Detail.Metadata.Separator");

export const Detail = Object.assign(DetailComponent, {
  Metadata: Object.assign(DetailMetadata, {
    Label: DetailMetadataLabel,
    TagList: Object.assign(DetailMetadataTagList, {
      Item: DetailMetadataTagListItem,
    }),
    Link: DetailMetadataLink,
    Separator: DetailMetadataSeparator,
  }),
});

// Grid Component
const GridComponent = createMockComponent("Grid");
const GridItem = createMockComponent("Grid.Item");
const GridSection = createMockComponent("Grid.Section");
const GridEmptyView = createMockComponent("Grid.EmptyView");

export const Grid = Object.assign(GridComponent, {
  Item: GridItem,
  Section: GridSection,
  EmptyView: GridEmptyView,
});
