import { vi } from "vitest";

vi.mock("@raycast/api", () => ({
  environment: {
    raycastVersion: "1.85.0",
  },
  Cache: vi.fn(),
  closeMainWindow: vi.fn(),
  open: vi.fn(),
  showToast: vi.fn(),
  Toast: { Style: { Success: "success", Failure: "failure" } },
  Icon: {
    Warning: "warning",
    Play: "play",
    Checkmark: "checkmark",
    ArrowDown: "arrow-down",
    CopyClipboard: "copy",
    Pencil: "pencil",
    Terminal: "terminal",
    Folder: "folder",
    Sidebar: "sidebar",
    ArrowClockwise: "arrow-clockwise",
    Gear: "gear",
    Warning: "warning",
  },
  Action: vi.fn(),
  ActionPanel: vi.fn(),
  List: vi.fn(),
  Color: { Orange: "orange", Blue: "blue" },
  Keyboard: {
    Shortcut: {
      Common: { OpenWith: "open-with", Copy: "copy", Duplicate: "duplicate", Remove: "remove", Refresh: "refresh" },
    },
  },
  getPreferenceValues: vi.fn(() => ({
    scriptDirectories: "",
    showBodyPreview: false,
    groupCommands: true,
    terminalApplication: undefined,
    defaultAuthor: "",
    defaultAuthorURL: "",
  })),
  showFailureToast: vi.fn(),
  confirmAlert: vi.fn(),
  openExtensionPreferences: vi.fn(),
}));
