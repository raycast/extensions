import { Clipboard, open, Toast } from "@raycast/api";

export function enrichToastWithURL(toast: Toast, url: string) {
  toast.primaryAction = {
    title: "Open Deploy Request",
    shortcut: { modifiers: ["shift", "cmd"], key: "o" },
    onAction: () => open(url),
  };

  toast.secondaryAction = {
    title: `Copy URL`,
    shortcut: { modifiers: ["shift", "cmd"], key: "c" },
    onAction: () => Clipboard.copy(url),
  };
}
