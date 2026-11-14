/** User layout for the dashboard: provider order and the providers hidden from it. */
export interface ProviderPrefs {
  order: string[];
  hidden: string[];
}

export const EMPTY_PREFS: ProviderPrefs = { order: [], hidden: [] };

export function parsePrefs(raw: string | undefined): ProviderPrefs {
  if (!raw) return EMPTY_PREFS;
  try {
    const value = JSON.parse(raw) as Partial<ProviderPrefs>;
    const strings = (list: unknown) =>
      Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
    return { order: strings(value.order), hidden: strings(value.hidden) };
  } catch {
    return EMPTY_PREFS;
  }
}

/**
 * Full ordering for the given providers: saved order first, then providers never seen
 * before in their original (CodexBar) order. Saved ids that are gone are dropped.
 */
export function orderedIds(prefs: ProviderPrefs, available: string[]): string[] {
  const known = prefs.order.filter((id) => available.includes(id));
  const fresh = available.filter((id) => !known.includes(id));
  return [...new Set([...known, ...fresh])];
}

/**
 * Applies the layout. With `only`, shows just that provider (a per-provider quicklink),
 * even when it is hidden from the full dashboard.
 */
export function applyPrefs<T extends { provider: string }>(items: T[], prefs: ProviderPrefs, only?: string): T[] {
  if (only) return items.filter((item) => item.provider === only);
  const order = orderedIds(
    prefs,
    items.map((item) => item.provider),
  );
  return items
    .filter((item) => !prefs.hidden.includes(item.provider))
    .sort((a, b) => order.indexOf(a.provider) - order.indexOf(b.provider));
}

export function moveProvider(prefs: ProviderPrefs, available: string[], id: string, delta: -1 | 1): ProviderPrefs {
  const order = orderedIds(prefs, available);
  const from = order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return { ...prefs, order };
  [order[from], order[to]] = [order[to], order[from]];
  return { ...prefs, order };
}

export function toggleHidden(prefs: ProviderPrefs, id: string): ProviderPrefs {
  const hidden = prefs.hidden.includes(id) ? prefs.hidden.filter((x) => x !== id) : [...prefs.hidden, id];
  return { ...prefs, hidden };
}
