export interface AppRef {
  name: string;
  bundleId?: string;
}

/** The installed app a typed name or bundle identifier means: exact, then prefix; it must be unambiguous. */
export function findApp<T extends AppRef>(apps: T[], query: string): T & { bundleId: string } {
  const q = query.trim().toLowerCase();
  const withId = apps.filter((a): a is T & { bundleId: string } => !!a.bundleId);
  for (const match of [
    (a: AppRef) => a.bundleId?.toLowerCase() === q,
    (a: AppRef) => a.name.toLowerCase() === q,
    (a: AppRef) => a.name.toLowerCase().startsWith(q),
  ]) {
    const found = withId.filter(match);
    if (found.length === 1) return found[0];
    if (found.length > 1) throw new Error(`"${query}" matches ${found.map((a) => a.name).join(", ")}.`);
  }
  throw new Error(`No app called "${query}" is installed.`);
}
