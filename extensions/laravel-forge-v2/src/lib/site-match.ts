import { ISite } from "../types";

// Find the site that best matches a typed domain, used by the Search Sites
// launch argument. Precedence: exact name > name substring > alias match.
export const findBestSiteMatch = (sites: ISite[], query: string): ISite | undefined => {
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;

  const byName = (predicate: (name: string) => boolean) =>
    sites.find((site) => predicate((site.name ?? "").toLowerCase()));

  const exact = byName((name) => name === needle);
  if (exact) return exact;

  const substring = byName((name) => name.includes(needle));
  if (substring) return substring;

  return sites.find((site) =>
    (site.aliases ?? []).some((alias) => {
      const value = alias.toLowerCase();
      return value === needle || value.includes(needle);
    })
  );
};

// Group each server's site domains (name + aliases) by server id, so the
// servers list can fold them into per-server search keywords without a
// separate per-org sites fetch. Sites with no resolved server are skipped.
export const keywordsByServer = (sites: ISite[]): Record<string, string[]> => {
  const acc: Record<string, Set<string>> = {};
  for (const site of sites) {
    if (!site?.server_id) continue;
    const words = [site.name ?? "", ...(site.aliases ?? [])].filter(Boolean) as string[];
    acc[site.server_id] ??= new Set<string>();
    words.forEach((word) => acc[site.server_id].add(word));
  }
  return Object.fromEntries(Object.entries(acc).map(([id, set]) => [id, [...set]]));
};
