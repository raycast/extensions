export const resolvePersistedSpaceSelection = ({
  currentSelection,
  validSelections,
  fallbackSelection,
  alwaysAllowedSelections = [],
}: {
  currentSelection: string;
  validSelections: string[];
  fallbackSelection: string;
  alwaysAllowedSelections?: string[];
}) => {
  if (!currentSelection) {
    return fallbackSelection;
  }

  const allowedSelections = new Set([...validSelections, ...alwaysAllowedSelections].filter(Boolean));

  return allowedSelections.has(currentSelection) ? currentSelection : fallbackSelection;
};
