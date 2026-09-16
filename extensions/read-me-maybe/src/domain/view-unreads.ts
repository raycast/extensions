import type { SourceResult } from "./unread-count";
import type { StoredSource } from "./source-catalog";

export const messageIcon = { source: { light: "message-light.png", dark: "message-dark.png" } };

export type SourceRowIcon = { fileIcon: string } | typeof messageIcon;

export function sourceRowIcon(appPath: string | undefined): SourceRowIcon {
  return appPath !== undefined ? { fileIcon: appPath } : messageIcon;
}

export type ViewItemStatus =
  | { kind: "badge"; label: string }
  | { kind: "zero"; label: "0" }
  | { kind: "attention"; label: "Unread activity" }
  | { kind: "unavailable"; label: string }
  | { kind: "disabled"; label: "Disabled" }
  | { kind: "notScanned"; label: "Not scanned yet" };

export type SourceViewItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: SourceRowIcon;
  status: ViewItemStatus;
  /** The Catalog row's flag: the view sections rows into Active and Disabled. */
  enabled: boolean;
};

function snapshotEntryStatus(entry: SourceResult): ViewItemStatus {
  if (entry.unavailable) return { kind: "unavailable", label: entry.label };
  if (entry.label === "0") return { kind: "zero", label: "0" };
  if (entry.label === "Unread activity") return { kind: "attention", label: "Unread activity" };
  return { kind: "badge", label: entry.label };
}

export function sourceViewItems(
  sources: readonly StoredSource[],
  snapshotSources: readonly SourceResult[],
): SourceViewItem[] {
  const entries = new Map(snapshotSources.map((entry) => [entry.id, entry]));
  return sources.map((source) => {
    const entry = entries.get(source.id);
    const status: ViewItemStatus = !source.enabled
      ? { kind: "disabled" as const, label: "Disabled" }
      : entry
        ? snapshotEntryStatus(entry)
        : { kind: "notScanned" as const, label: "Not scanned yet" };
    return {
      id: source.id,
      title: source.name,
      subtitle: source.dockName,
      icon: sourceRowIcon(source.appPath),
      status,
      enabled: source.enabled,
    };
  });
}
