export type AppIdentity = {
  appName: string;
  bundleId: string;
  localizedName?: string;
};

export function matchesApp(app: AppIdentity, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const fields = [app.appName, app.localizedName, app.bundleId]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  const compactFields = fields.map((field) => field.replace(/[^a-z0-9]+/g, ""));
  const compactQuery = normalizedQuery.replace(/[^a-z0-9]+/g, "");

  if (fields.some((field) => field.includes(normalizedQuery))) {
    return true;
  }

  if (compactQuery && compactFields.some((field) => field.includes(compactQuery))) {
    return true;
  }

  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  return words.length > 1 && fields.some((field) => words.every((word) => field.includes(word)));
}

export function filterWindowsByAppQuery<T extends AppIdentity>(windows: T[], query: string): T[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return windows;
  }

  return windows.filter((window) => matchesApp(window, normalizedQuery));
}

export function hasMatchingApp<T extends AppIdentity>(windows: T[], query: string): boolean {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return windows.length > 0;
  }

  const seen = new Set<string>();
  for (const window of windows) {
    const key = window.bundleId || window.appName;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (matchesApp(window, normalizedQuery)) {
      return true;
    }
  }

  return false;
}
