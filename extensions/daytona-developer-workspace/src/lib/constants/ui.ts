/**
 * UI-related constants
 */

import { Icon } from "@raycast/api";

export const ICONS = {
  SANDBOX: {
    RUNNING: Icon.CheckCircle,
    STOPPED: Icon.Stop,
    CREATING: Icon.Clock,
    DELETING: Icon.Trash,
    STARTING: Icon.Play,
    STOPPING: Icon.Stop,
  },
  GIT: {
    BRANCH: Icon.Tree,
    COMMIT: Icon.Checkmark,
    MERGE: Icon.ArrowClockwise,
    PUSH: Icon.Upload,
    PULL: Icon.Download,
    STATUS: Icon.Tree,
    CONFLICT: Icon.Warning,
  },
  EXECUTION: {
    RUN: Icon.Play,
    SUCCESS: Icon.CheckCircle,
    ERROR: Icon.XMarkCircle,
    TIMEOUT: Icon.Clock,
    CANCELLED: Icon.Stop,
  },
  FILES: {
    FILE: Icon.Document,
    FOLDER: Icon.Folder,
    FOLDER_OPEN: Icon.Folder,
    SYMLINK: Icon.Link,
    HIDDEN: Icon.EyeDisabled,
  },
  ACTIONS: {
    CREATE: Icon.Plus,
    EDIT: Icon.Pencil,
    DELETE: Icon.Trash,
    COPY: Icon.CopyClipboard,
    SHARE: Icon.Forward,
    REFRESH: Icon.RotateClockwise,
    SETTINGS: Icon.Gear,
    INFO: Icon.Info,
    SEARCH: Icon.MagnifyingGlass,
  },
  STATUS: {
    SUCCESS: Icon.CheckCircle,
    ERROR: Icon.XMarkCircle,
    WARNING: Icon.Warning,
    INFO: Icon.Info,
    LOADING: Icon.Clock,
  },
} as const;

export const COLORS = {
  STATUS: {
    RUNNING: "#10B981", // Green
    STOPPED: "#6B7280", // Gray
    CREATING: "#F59E0B", // Amber
    DELETING: "#EF4444", // Red
    ERROR: "#EF4444", // Red
    WARNING: "#F59E0B", // Amber
    SUCCESS: "#10B981", // Green
  },
  GIT: {
    ADDED: "#10B981", // Green
    MODIFIED: "#F59E0B", // Amber
    DELETED: "#EF4444", // Red
    UNTRACKED: "#6B7280", // Gray
    STAGED: "#8B5CF6", // Purple
    CONFLICT: "#EF4444", // Red
  },
} as const;

export const SIZES = {
  AVATAR: {
    SMALL: 16,
    MEDIUM: 24,
    LARGE: 32,
  },
  ICON: {
    SMALL: 12,
    MEDIUM: 16,
    LARGE: 20,
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
  },
} as const;

export const LAYOUT = {
  LIST: {
    ITEMS_PER_PAGE: 20,
    VIRTUALIZATION_THRESHOLD: 50,
    SEARCH_DEBOUNCE: 300,
  },
  FORM: {
    FIELD_SPACING: 16,
    SECTION_SPACING: 24,
    VALIDATION_DEBOUNCE: 500,
  },
  MODAL: {
    MAX_WIDTH: 600,
    MAX_HEIGHT: 400,
  },
} as const;

export const KEYBOARD_SHORTCUTS = {
  GLOBAL: {
    REFRESH: { modifiers: ["cmd"], key: "r" },
    SEARCH: { modifiers: ["cmd"], key: "f" },
    CREATE: { modifiers: ["cmd"], key: "n" },
    SETTINGS: { modifiers: ["cmd"], key: "," },
  },
  SANDBOX: {
    START: { modifiers: ["cmd"], key: "s" },
    STOP: { modifiers: ["cmd", "shift"], key: "s" },
    DELETE: { modifiers: ["cmd"], key: "backspace" },
    CLONE: { modifiers: ["cmd"], key: "d" },
    FILES: { modifiers: ["cmd"], key: "o" },
    GIT: { modifiers: ["cmd"], key: "g" },
  },
  EXECUTION: {
    RUN: { modifiers: ["cmd"], key: "enter" },
    CANCEL: { modifiers: ["cmd"], key: "c" },
    CLEAR: { modifiers: ["cmd"], key: "k" },
    SAVE: { modifiers: ["cmd"], key: "s" },
  },
  GIT: {
    COMMIT: { modifiers: ["cmd"], key: "enter" },
    PUSH: { modifiers: ["cmd", "shift"], key: "p" },
    PULL: { modifiers: ["cmd", "shift"], key: "l" },
    STAGE: { modifiers: [], key: "space" },
  },
};

export const MESSAGES = {
  EMPTY_STATES: {
    NO_SANDBOXES: {
      title: "No Sandboxes Found",
      description: "Create your first sandbox to get started with Daytona development.",
    },
    NO_SNAPSHOTS: {
      title: "No Snapshots Available",
      description: "Snapshots help you save and restore sandbox states.",
    },
    NO_FILES: {
      title: "Directory is Empty",
      description: "This directory contains no files or folders.",
    },
    NO_HISTORY: {
      title: "No Execution History",
      description: "Your code execution history will appear here.",
    },
    NO_GIT_CHANGES: {
      title: "No Changes",
      description: "Your working directory is clean.",
    },
    NO_SEARCH_RESULTS: {
      title: "No Results Found",
      description: "Try adjusting your search criteria.",
    },
  },
  LOADING: {
    SANDBOXES: "Loading sandboxes...",
    SNAPSHOTS: "Loading snapshots...",
    FILES: "Loading files...",
    EXECUTING: "Executing code...",
    GIT_STATUS: "Checking git status...",
    CREATING: "Creating sandbox...",
    DELETING: "Deleting sandbox...",
  },
  SUCCESS: {
    SANDBOX_CREATED: "Sandbox created successfully",
    SANDBOX_STARTED: "Sandbox started successfully",
    SANDBOX_STOPPED: "Sandbox stopped successfully",
    SANDBOX_DELETED: "Sandbox deleted successfully",
    CODE_EXECUTED: "Code executed successfully",
    GIT_COMMITTED: "Changes committed successfully",
    GIT_PUSHED: "Changes pushed successfully",
    GIT_PULLED: "Changes pulled successfully",
  },
  ERRORS: {
    GENERIC: "An unexpected error occurred",
    NETWORK: "Network connection failed",
    UNAUTHORIZED: "Authentication failed",
    NOT_FOUND: "Resource not found",
    VALIDATION: "Validation failed",
    TIMEOUT: "Operation timed out",
    RATE_LIMITED: "Rate limit exceeded",
  },
} as const;
