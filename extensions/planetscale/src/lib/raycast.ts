import { Clipboard, open, Toast } from "@raycast/api";
import { capitalize } from "lodash";

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

export function titleCase(str: string) {
  return capitalize(str.replace(/_/g, " "));
}
