export function shouldShowMenuBar(storedVisibility: string | undefined): boolean {
  return storedVisibility !== "false";
}

export function visibilityAfterToggle(storedVisibility: string | undefined): boolean {
  if (storedVisibility === undefined) return true;
  return !shouldShowMenuBar(storedVisibility);
}
