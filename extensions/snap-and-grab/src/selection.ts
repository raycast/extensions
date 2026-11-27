export interface Screenshot {
  path: string;
  name: string;
  modifiedAt: string;
}

export function toggleSelection(selected: ReadonlySet<string>, path: string): Set<string> {
  const next = new Set(selected);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  return next;
}

export function selectedInHistoryOrder(history: readonly Screenshot[], selected: ReadonlySet<string>): Screenshot[] {
  const seen = new Set<string>();
  return history.filter(({ path }) => {
    if (!selected.has(path) || seen.has(path)) return false;
    seen.add(path);
    return true;
  });
}
