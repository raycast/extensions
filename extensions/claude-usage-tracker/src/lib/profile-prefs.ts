/** User layout for the dashboard: profile order and the profiles hidden from it. */
export interface ProfilePrefs {
  order: string[];
  hidden: string[];
}

export const EMPTY_PREFS: ProfilePrefs = { order: [], hidden: [] };

export function parsePrefs(raw: string | undefined): ProfilePrefs {
  if (!raw) return EMPTY_PREFS;
  try {
    const value = JSON.parse(raw) as Partial<ProfilePrefs>;
    const strings = (list: unknown) =>
      Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
    return { order: strings(value.order), hidden: strings(value.hidden) };
  } catch {
    return EMPTY_PREFS;
  }
}

/**
 * Full ordering for the given profiles: saved order first, then profiles never seen
 * before in their original (Claude Usage) order. Saved ids that are gone are dropped.
 */
export function orderedIds(prefs: ProfilePrefs, available: string[]): string[] {
  const known = prefs.order.filter((id) => available.includes(id));
  const fresh = available.filter((id) => !known.includes(id));
  return [...new Set([...known, ...fresh])];
}

/**
 * Applies the layout. With `only`, shows just that profile (a per-profile quicklink),
 * even when it is hidden from the full dashboard.
 */
export function applyPrefs<T extends { profile: string }>(items: T[], prefs: ProfilePrefs, only?: string): T[] {
  if (only) return items.filter((item) => item.profile === only);
  const order = orderedIds(
    prefs,
    items.map((item) => item.profile),
  );
  return items
    .filter((item) => !prefs.hidden.includes(item.profile))
    .sort((a, b) => order.indexOf(a.profile) - order.indexOf(b.profile));
}

export function moveProfile(prefs: ProfilePrefs, available: string[], id: string, delta: -1 | 1): ProfilePrefs {
  const order = orderedIds(prefs, available);
  const from = order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return { ...prefs, order };
  [order[from], order[to]] = [order[to], order[from]];
  return { ...prefs, order };
}

export function toggleHidden(prefs: ProfilePrefs, id: string): ProfilePrefs {
  const hidden = prefs.hidden.includes(id) ? prefs.hidden.filter((x) => x !== id) : [...prefs.hidden, id];
  return { ...prefs, hidden };
}
