export interface DestinationSelectionInput {
  currentId: string;
  storedId: string;
  defaultId?: string;
  availableIds: string[];
}

export interface DestinationSelection {
  selectedId: string;
  requiresReselection: boolean;
}

export function resolveDestinationSelection({
  currentId,
  storedId,
  defaultId,
  availableIds,
}: DestinationSelectionInput): DestinationSelection {
  const available = new Set(availableIds);
  const previousId = currentId || storedId;

  if (previousId) {
    return available.has(previousId)
      ? { selectedId: previousId, requiresReselection: false }
      : { selectedId: "", requiresReselection: true };
  }

  const initialId = defaultId && available.has(defaultId) ? defaultId : (availableIds[0] ?? "");
  return { selectedId: initialId, requiresReselection: false };
}
