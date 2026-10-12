import type { EntryKind } from "./types";

export function entryKindLabel(kind: EntryKind): string {
  switch (kind) {
    case "app":
      return "Application";
    case "file":
      return "File / Folder";
    case "url":
      return "URL / Deeplink";
    case "shell":
      return "Shell Command";
  }
}

export function entryKindPlaceholder(kind: EntryKind): string {
  switch (kind) {
    case "app":
      return "/Applications/Ghostty.app";
    case "file":
      return "~/Documents";
    case "url":
      return "raycast://extensions/…";
    case "shell":
      return "open -a Ghostty";
  }
}
