import type { ShortcutIndex } from "./drive-shortcuts";
import type { SharedIndex } from "./shared-scan";

export type IndexPartialReason = "time-limit" | "depth-limit" | "item-limit";

type PartialIndex = {
  partial: boolean;
  partialReason?: IndexPartialReason;
};

/** Describes why a saved Google Drive index is incomplete. */
export function driveIndexCaveat(
  shortcuts: PartialIndex,
  shared: PartialIndex,
): string | undefined {
  const partial = [shortcuts, shared].filter((index) => index.partial);
  if (partial.length === 0) return undefined;
  if (partial.some((index) => index.partialReason === undefined)) {
    return "Google Drive index stopped early";
  }

  const describe = (
    kind: "shortcut" | "shared-folder",
    reason: IndexPartialReason,
  ) => {
    if (reason === "depth-limit") {
      return `Google Drive ${kind} index excludes deeper folders`;
    }
    if (reason === "item-limit") {
      return `Google Drive ${kind} index reached its item limit`;
    }
    return `Google Drive ${kind} indexing stopped at the time limit`;
  };

  const shortcutMessage =
    shortcuts.partial && shortcuts.partialReason
      ? describe("shortcut", shortcuts.partialReason)
      : undefined;
  const sharedMessage =
    shared.partial && shared.partialReason
      ? describe("shared-folder", shared.partialReason)
      : undefined;
  return [shortcutMessage, sharedMessage].filter(Boolean).join(" · ");
}

/** Partial scans prove presence, not absence. New observations win by path. */
export function refreshShortcutIndex(
  previous: ShortcutIndex,
  incoming: ShortcutIndex,
): ShortcutIndex {
  if (!incoming.available || incoming.error) return previous;
  if (!incoming.partial) return incoming;
  const shortcuts = new Map(
    previous.shortcuts.map((item) => [item.path, item]),
  );
  for (const item of incoming.shortcuts) shortcuts.set(item.path, item);
  return { ...incoming, shortcuts: [...shortcuts.values()] };
}

/** Only a complete, readable scan may remove saved paths. */
export function refreshSharedIndex(
  previous: SharedIndex,
  incoming: SharedIndex,
): SharedIndex {
  if (!incoming.available || incoming.error) return previous;
  if (!incoming.partial) return incoming;
  return {
    ...incoming,
    paths: [...new Set([...previous.paths, ...incoming.paths])],
  };
}
