import { Clipboard, open, Toast } from "@raycast/api";

export function enrichToastWithURL(toast: Toast, { resource, url }: { resource: string; url: string }) {
  toast.primaryAction = {
    title: `Open ${resource}`,
    shortcut: { modifiers: ["shift", "cmd"], key: "o" },
    onAction: () => open(url),
  };

  toast.secondaryAction = {
    title: `Copy URL`,
    shortcut: { modifiers: ["shift", "cmd"], key: "c" },
    onAction: () => Clipboard.copy(url),
  };
}
