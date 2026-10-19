import { tmpdir } from "os";
import { join } from "path";
import { createElement, type ReactNode } from "react";
import { vi, type Mock } from "vitest";
import type { Alert, Application, Toast as ToastType, PreferenceValues } from "@raycast/api";

export const confirmAlert: Mock<(options: Alert.Options) => Promise<boolean>> = vi.fn(async () => false);

export const Toast = {
  Style: {
    Success: "SUCCESS",
    Failure: "FAILURE",
    Animated: "ANIMATED",
  } as const satisfies Record<keyof typeof ToastType.Style, string>,
};

export const openExtensionPreferences: Mock<() => Promise<void>> = vi.fn(async () => {});

export const openCommandPreferences: Mock<() => Promise<void>> = vi.fn(async () => {});

export const LaunchType = {
  UserInitiated: "userInitiated",
  Background: "background",
} as const;

export const environment = {
  supportPath: join(tmpdir(), `pods-control-raycast-test-${process.pid}-${Math.random().toString(36).slice(2)}`),
};

export const Keyboard = {
  Shortcut: {
    Common: {
      Copy: { modifiers: ["cmd"], key: "c" },
      Open: { modifiers: ["cmd"], key: "o" },
      OpenWith: { modifiers: ["cmd", "shift"], key: "o" },
      Refresh: { modifiers: ["cmd"], key: "r" },
    },
  },
} as const;

export const Clipboard = {
  copy: vi.fn(async (content: string) => {
    void content;
  }),
};

export const launchCommand: Mock<
  (options: { name: string; type: string; context?: Record<string, unknown> | null }) => Promise<void>
> = vi.fn(async () => {});

export const updateCommandMetadata: Mock<(metadata: { subtitle?: string | null }) => Promise<void>> = vi.fn(
  async () => {},
);

export const open: Mock<(target: string, application?: Application | string) => Promise<void>> = vi.fn(async () => {});

export const showToast: Mock<(options: ToastType.Options) => Promise<ToastType>> = vi.fn(async (options) => ({
  style: options.style,
  title: options.title,
  message: options.message,
  primaryAction: options.primaryAction,
  secondaryAction: options.secondaryAction,
  hide: vi.fn(async () => {}),
  show: vi.fn(async () => {}),
  id: "",
  options,
  callbacks: {},
})) as unknown as Mock<(options: ToastType.Options) => Promise<ToastType>>;

export const showHUD: Mock<(title: string) => Promise<void>> = vi.fn(async () => {});

export const closeMainWindow: Mock<
  (options?: { clearRootSearch?: boolean; popToRootType?: unknown }) => Promise<void>
> = vi.fn(async () => {});

export const getPreferenceValues: Mock<<Values extends PreferenceValues = PreferenceValues>() => Values> = vi.fn(
  () => ({}) as never,
);

interface MockDetailProps {
  actions?: ReactNode;
  isLoading?: boolean;
  markdown?: string;
}

export function Detail({ actions, isLoading, markdown }: MockDetailProps) {
  return createElement(
    "div",
    { "data-testid": "detail", "data-loading": isLoading ? "true" : "false" },
    createElement("div", { "data-testid": "markdown" }, markdown),
    actions,
  );
}

export function ActionPanel({ children }: { children?: ReactNode }) {
  return createElement("div", { "data-testid": "action-panel" }, children);
}

ActionPanel.Section = function Section({ children, title }: { children?: ReactNode; title?: string }) {
  return createElement("div", { "data-section-title": title }, children);
};

interface MockActionProps {
  children?: ReactNode;
  icon?: string;
  onAction?: () => void;
  title: string;
}

interface MockCopyToClipboardProps {
  content: string;
  title: string;
}

interface MockOpenInBrowserProps {
  title: string;
  url: string;
}

const MockAction = Object.assign(
  function MockAction({ children, onAction, title }: MockActionProps) {
    return createElement(
      "button",
      { type: "button", "data-action-title": title, onClick: onAction },
      children ?? title,
    );
  },
  {
    CopyToClipboard: function MockCopyToClipboard({ content, title }: MockCopyToClipboardProps) {
      return createElement(
        "button",
        { type: "button", "data-action-title": title, onClick: () => Clipboard.copy(content) },
        title,
      );
    },
    OpenInBrowser: function MockOpenInBrowser({ title, url }: MockOpenInBrowserProps) {
      return createElement("button", { type: "button", "data-action-title": title, onClick: () => open(url) }, title);
    },
  },
);

export const Action = MockAction;

export const Icon = {
  ArrowClockwise: "ArrowClockwise",
  Download: "Download",
  Gear: "Gear",
} as const;
