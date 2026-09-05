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

/** A bounded refresh must not discard a complete, non-empty index. */
export function shouldReplaceIndex(
  existingCount: number,
  sourceAvailable: boolean,
  sourcePartial = false,
  existingPartial = false,
): boolean {
  return (
    existingCount === 0 ||
    (sourceAvailable && (!sourcePartial || existingPartial))
  );
}

/** Saves partial progress only when there is no useful index to protect. */
export function shouldSaveCheckpoint(existingCount: number): boolean {
  return existingCount === 0;
}
