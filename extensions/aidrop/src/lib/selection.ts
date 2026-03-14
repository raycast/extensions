export function togglePathSelection(
  selectedPaths: ReadonlySet<string>,
  path: string,
): Set<string> {
  const next = new Set(selectedPaths);

  if (next.has(path)) {
    next.delete(path);
  } else {
    next.add(path);
  }

  return next;
}

export function getSelectedPathsInDisplayOrder<T extends { path: string }>(
  items: readonly T[],
  selectedPaths: ReadonlySet<string>,
): string[] {
  return items
    .filter((item) => selectedPaths.has(item.path))
    .map((item) => item.path);
}
