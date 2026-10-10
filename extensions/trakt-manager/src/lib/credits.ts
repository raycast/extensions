type Titled = { title: string; year?: number | null; ids: { trakt: number } };

type CreditEntry = { characters?: string[] | null; jobs?: string[] | null; movie?: unknown; show?: unknown };

/** `/people/:id/movies` or `/people/:id/shows`: cast entries, and crew entries grouped by department. */
export type PersonCredits = { cast?: CreditEntry[] | null; crew?: Record<string, CreditEntry[]> | null };

export type Credit<T extends Titled> = { title: T; role: string };

/**
 * One entry per title the person worked on, newest first, with every role on it joined
 * ("as Walter White · Producer"). A title both acted in and directed appears once.
 */
export function toCredits<T extends Titled>(credits: PersonCredits, key: "movie" | "show"): Credit<T>[] {
  const byId = new Map<number, { title: T; roles: string[] }>();
  const add = (title: T | undefined, roles: string[]) => {
    if (!title) return;
    const current = byId.get(title.ids.trakt) ?? { title, roles: [] };
    current.roles.push(...roles.filter((role) => !current.roles.includes(role)));
    byId.set(title.ids.trakt, current);
  };

  for (const entry of credits.cast ?? []) {
    const characters = (entry.characters ?? []).filter(Boolean);
    add(entry[key] as T | undefined, characters.length > 0 ? [`as ${characters.join(", ")}`] : ["Cast"]);
  }
  for (const department of Object.values(credits.crew ?? {})) {
    for (const entry of department) add(entry[key] as T | undefined, (entry.jobs ?? []).filter(Boolean));
  }

  return [...byId.values()]
    .map(({ title, roles }) => ({ title, role: roles.join(" · ") }))
    .sort((a, b) => (b.title.year ?? 0) - (a.title.year ?? 0));
}
