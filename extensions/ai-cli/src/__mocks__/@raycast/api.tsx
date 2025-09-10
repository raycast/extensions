// Boundary-only mock for @raycast/api
// This mock only covers external Raycast APIs, letting internal hooks run naturally
// noinspection JSUnusedLocalSymbols

import React from "react";
import { vi } from "vitest";

// Environment
export const environment = {
  isDevelopment: true,
  canAccess: vi.fn(() => true),
};

// Simple mock components that actually render content
export const Form = ({
  children,
  actions,
  ...props
}: {
  children?: React.ReactNode;
  actions?: React.ReactNode;
  navigationTitle?: string;
  [_key: string]: unknown;
}) => {
  return (
    <div data-testid="form" {...props}>
      {children}
      {actions}
    </div>
  );
};

Form.TextField = ({
  value,
  onChange,
  ...props
}: {
  value?: string;
  onChange?: (value: string) => void;
  [_key: string]: unknown;
}) => {
  return (
    <input
      data-testid="form-textfield"
      value={value}
      // @ts-expect-error -- target value exists
      onChange={onChange ? (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) : undefined}
      {...props}
    />
  );
};

Form.FilePicker = ({
  value,
  onChange,
  ...props
}: {
  value?: string[];
  onChange?: (value: string[]) => void;
  [_key: string]: unknown;
}) => {
  return (
    <input
      data-testid="form-filepicker"
      value={Array.isArray(value) ? value.join(",") : ""}
      onChange={
        onChange
          ? (e: React.ChangeEvent<HTMLInputElement>) => {
              // @ts-expect-error -- target value exists
              const paths = e.target.value ? e.target.value.split(",") : [];
              onChange(paths);
            }
          : undefined
      }
      {...props}
    />
  );
};

Form.TextArea = ({
  value,
  onChange,
  ...props
}: {
  value?: string;
  onChange?: (value: string) => void;
  [_key: string]: unknown;
}) => {
  // Use React state to make this a controlled component that works with user-event
  const [internalValue, setInternalValue] = React.useState(value || "");

  // Update internal value when prop value changes
  React.useEffect(() => {
    setInternalValue(value || "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // @ts-expect-error -- target value exists
    const newValue = e.target.value;
    setInternalValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return <textarea data-testid="form-textarea" value={internalValue} onChange={handleChange} {...props} />;
};

Form.Description = ({ text, ...props }: { text?: string; [key: string]: unknown }) => {
  return (
    <div data-testid="form-description" {...props}>
      {text}
    </div>
  );
};

Form.Separator = (props: { [key: string]: unknown }) => {
  return <hr data-testid="form-separator" {...props} />;
};

const FormDropdown = ({
  children,
  value,
  onChange,
  ...props
}: {
  children?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  [key: string]: unknown;
}) => {
  return (
    <select
      data-testid="form-dropdown"
      value={value}
      // @ts-expect-error -- target value exists
      onChange={onChange ? (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value) : undefined}
      {...props}
    >
      {children}
    </select>
  );
};

FormDropdown.Item = ({
  children,
  title,
  value,
  ...props
}: {
  children?: React.ReactNode;
  title?: string;
  value?: string;
  [key: string]: unknown;
}) => {
  return (
    <option data-testid="form-dropdown-item" value={value} {...props}>
      {title || children}
    </option>
  );
};

FormDropdown.Section = ({
  children,
  title,
  ...props
}: {
  children?: React.ReactNode;
  title?: string;
  [key: string]: unknown;
}) => {
  return (
    <optgroup data-testid="form-dropdown-section" label={title} {...props}>
      {children}
    </optgroup>
  );
};

Form.Dropdown = FormDropdown;

Form.DatePicker = (props: { [key: string]: unknown }) => {
  return <input type="date" data-testid="form-datepicker" {...props} />;
};

Form.Checkbox = (props: { [key: string]: unknown }) => {
  return <input type="checkbox" data-testid="form-checkbox" {...props} />;
};

Form.PasswordField = ({
  value,
  onChange,
  ...props
}: {
  value?: string;
  onChange?: (value: string) => void;
  [_key: string]: unknown;
}) => {
  return (
    <input
      type="password"
      data-testid="form-passwordfield"
      value={value}
      // @ts-expect-error -- target value exists
      onChange={onChange ? (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) : undefined}
      {...props}
    />
  );
};

export const ActionPanel = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
  return (
    <div data-testid="action-panel" {...props}>
      {children}
    </div>
  );
};

ActionPanel.Section = ({
  children,
  title,
  ...props
}: {
  children?: React.ReactNode;
  title?: string;
  [_key: string]: unknown;
}) => {
  return (
    <div data-testid="action-panel-section" {...props}>
      {title}
      {children}
    </div>
  );
};

export const Action = ({
  children,
  onAction,
  style,
  title,
  disabled,
  "data-testid": testId,
  ...props
}: {
  children?: React.ReactNode;
  onAction?: () => void;
  style?: string | object;
  title?: string;
  disabled?: boolean;
  "data-testid"?: string;
  [_key: string]: unknown;
}) => {
  return (
    <button
      data-testid={testId || "action"}
      onClick={onAction}
      disabled={disabled}
      data-style={style} // Store style as data attribute to avoid React DOM warning
      {...props}
    >
      {children || title}
    </button>
  );
};

Action.SubmitForm = ({
  title,
  onSubmit,
  ...props
}: {
  title?: string;
  onSubmit?: () => void;
  [key: string]: unknown;
}) => (
  <button data-testid="action-submit-form" onClick={onSubmit} title={title} {...props}>
    {title}
  </button>
);
Action.OpenInBrowser = ({ title, ...props }: { title?: string; [key: string]: unknown }) => (
  <button data-testid="action-open-browser" {...props}>
    {title}
  </button>
);
Action.CopyToClipboard = ({
  title,
  onCopy,
  ...props
}: {
  title?: string;
  onCopy?: () => void;
  [key: string]: unknown;
}) => (
  <button data-testid="action-copy-clipboard" onClick={onCopy} {...props}>
    {title}
  </button>
);
Action.Push = ({ title, onPush, ...props }: { title?: string; onPush?: () => void; [key: string]: unknown }) => (
  <button data-testid="action-push" onClick={onPush} {...props}>
    {title}
  </button>
);
Action.Pop = ({ title, ...props }: { title?: string; [key: string]: unknown }) => (
  <button data-testid="action-pop" {...props}>
    {title}
  </button>
);

Action.Style = {
  Destructive: "destructive",
};

export const List = ({
  children,
  isLoading,
  searchText,
  onSearchTextChange,
  searchBarPlaceholder,
  navigationTitle,
  actions,
  ...props
}: {
  children?: React.ReactNode;
  isLoading?: boolean;
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  searchBarPlaceholder?: string;
  navigationTitle?: string;
  actions?: React.ReactNode;
  [_key: string]: unknown;
}) => {
  return (
    <div
      role="list"
      data-testid="list"
      data-loading={isLoading}
      data-search-text={searchText}
      data-placeholder={searchBarPlaceholder}
      data-navigation-title={navigationTitle}
      {...props}
    >
      <input
        data-testid="search-input"
        value={searchText || ""}
        onChange={
          onSearchTextChange
            ? // @ts-expect-error -- target value exists
              (e: React.ChangeEvent<HTMLInputElement>) => onSearchTextChange(e.target.value)
            : undefined
        }
        placeholder={searchBarPlaceholder}
      />
      <div data-testid="list-actions">{actions}</div>
      <div data-testid="list-content">{children}</div>
    </div>
  );
};

const ListItem = ({
  children,
  actions,
  title,
  subtitle,
  icon,
  accessories,
  detail,
  ...props
}: {
  children?: React.ReactNode;
  actions?: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: string;
  accessories?: unknown;
  detail?: React.ReactNode;
  [_key: string]: unknown;
}) => {
  return (
    <div
      data-testid="list-item"
      role="listitem"
      data-title={title}
      data-subtitle={subtitle}
      data-icon={icon}
      data-accessories={JSON.stringify(accessories || null)}
      {...props}
    >
      {title && <span>{title}</span>}
      {subtitle && <span>{subtitle}</span>}
      {detail && <div data-testid="list-item-detail-rendered">{detail}</div>}
      {children}
      {actions}
    </div>
  );
};

List.Section = ({
  children,
  title,
  ...props
}: {
  children?: React.ReactNode;
  title?: string;
  [_key: string]: unknown;
}) => {
  return (
    <div data-testid="list-section" data-title={title} {...props}>
      <h3>{title}</h3>
      {children}
    </div>
  );
};

List.EmptyView = ({
  title,
  description,
  actions,
  icon,
  ...props
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: string;
  [_key: string]: unknown;
}) => {
  return (
    <div data-testid="list-empty-view" data-title={title} data-description={description} data-icon={icon} {...props}>
      <h2>{title}</h2>
      <p>{description}</p>
      <div data-testid="empty-view-actions">{actions}</div>
    </div>
  );
};

const ListItemDetail = ({
  children,
  markdown,
  metadata,
  ...props
}: {
  children?: React.ReactNode;
  markdown?: string;
  metadata?: React.ReactNode;
  [_key: string]: unknown;
}) => {
  return (
    <div data-testid="list-item-detail" {...props}>
      {markdown && <div data-testid="detail-markdown">{markdown}</div>}
      {metadata && <div data-testid="detail-metadata">{metadata}</div>}
      {children}
    </div>
  );
};

const ListItemDetailMetadata = ({ children, ...props }: { children?: React.ReactNode; [_key: string]: unknown }) => {
  return (
    <div data-testid="detail-metadata-container" {...props}>
      {children}
    </div>
  );
};

const ListItemDetailMetadataLabel = ({
  title,
  text,
  icon,
  ...props
}: {
  title?: string;
  text?: string;
  icon?: string;
  [_key: string]: unknown;
}) => {
  return (
    <div data-testid="metadata-label" data-title={title} data-text={text} data-icon={icon} {...props}>
      <span className="label-title">{title}</span>
      <span className="label-text">{text}</span>
    </div>
  );
};

// Set up the nested structure
ListItemDetail.Metadata = ListItemDetailMetadata;
ListItemDetailMetadata.Label = ListItemDetailMetadataLabel;
ListItem.Detail = ListItemDetail;
List.Item = ListItem;

export const Detail = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
  return (
    <div data-testid="detail" {...props}>
      {children}
    </div>
  );
};

export const Grid = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
  return (
    <div data-testid="grid" {...props}>
      {children}
    </div>
  );
};

Grid.Item = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
  return (
    <div data-testid="grid-item" {...props}>
      {children}
    </div>
  );
};

// Other utilities
export const open = vi.fn(() => Promise.resolve(undefined));

export const getPreferenceValues = vi.fn(() => ({
  selectedAgent: "claude",
  claudePath: "~/.claude/local/claude",
  claudeToken: "sk-ant-oat01-test-token-for-testing",
  codexPath: "",
  codexToken: "",
  geminiPath: "",
  geminiToken: "",
  agentWorkingDir: "~/.devprompt",
  shellPath: "/bin/sh",
}));

export const LocalStorage = {
  getItem: vi.fn(() => Promise.resolve(null)),
  setItem: vi.fn(() => Promise.resolve()),
  removeItem: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
  allItems: vi.fn(() => Promise.resolve({})),
};

// Toast utilities
export const showToast = vi.fn(() => Promise.resolve());

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

// Icon utilities
export const Icon = {
  Document: "Document",
  Clipboard: "Clipboard",
  Pencil: "Pencil",
  Trash: "Trash",
  Plus: "Plus",
  XMarkCircle: "XMarkCircle",
  Gear: "Gear",
  Stars: "Stars",
  Circle: "Circle",
  Checkmark: "Checkmark",
  Wand: "Wand",
  Check: "Check",
  CopyClipboard: "CopyClipboard",
  Cog: "Cog",
  Warning: "Warning",
  Person: "Person",
  SaveDocument: "SaveDocument",
  RotateAntiClockwise: "RotateAntiClockwise",
  Download: "Download",
  Star: "Star",
  Bolt: "Bolt",
  Forward: "Forward",
};

// Keyboard utilities
export const Keyboard = {
  KeyModifier: {
    Cmd: "cmd" as const,
    Ctrl: "ctrl" as const,
    Opt: "opt" as const,
    Shift: "shift" as const,
  },
  KeyEquivalent: {} as Record<string, string>, // Placeholder for key values
  Shortcut: {
    Common: {
      Copy: { modifiers: ["cmd", "shift"], key: "c" },
      Edit: { modifiers: ["cmd"], key: "e" },
      Remove: { modifiers: ["ctrl"], key: "x" },
      New: { modifiers: ["cmd"], key: "n" },
      Open: { modifiers: ["cmd"], key: "o" },
      ToggleQuickLook: { modifiers: ["cmd"], key: "y" },
    },
  },
};

// Add type definitions for better TypeScript support
export type KeyModifier = "cmd" | "ctrl" | "opt" | "shift";
export type KeyEquivalent =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "return"
  | "delete"
  | "tab"
  | "arrowUp"
  | "arrowDown"
  | "arrowLeft"
  | "arrowRight"
  | "space"
  | "escape"
  | "enter"
  | "backspace";

export interface KeyboardShortcut {
  modifiers: KeyModifier[];
  key: KeyEquivalent;
}

// Confirmation utilities
export const confirmAlert = vi.fn(() => Promise.resolve(true));

// Command launching utilities
export const launchCommand = vi.fn(() => Promise.resolve());

export const LaunchType = {
  UserInitiated: "user-initiated",
};

export const Alert = {
  ActionStyle: {
    Default: "default",
    Destructive: "destructive",
    Cancel: "cancel",
  },
};

// Clipboard utilities
export const Clipboard = {
  copy: vi.fn(() => Promise.resolve()),
  paste: vi.fn(() => Promise.resolve("test")),
  readText: vi.fn(() => Promise.resolve("")),
  clear: vi.fn(() => Promise.resolve()),
};

// Navigation hooks (re-export from @raycast/utils but needed for direct imports)
export const useNavigation = vi.fn(() => ({
  push: vi.fn(),
  pop: vi.fn(),
}));
