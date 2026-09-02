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

/** Keeps a useful index when its replacement source is unavailable. */
export function shouldReplaceIndex(
  existingCount: number,
  sourceAvailable: boolean,
): boolean {
  return sourceAvailable || existingCount === 0;
}

/** Saves partial progress only when there is no useful index to protect. */
export function shouldSaveCheckpoint(existingCount: number): boolean {
  return existingCount === 0;
}
