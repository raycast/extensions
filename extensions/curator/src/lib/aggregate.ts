import type { DisplaySkill, ParsedSkill, Surface } from "./types";

function isCache(s: ParsedSkill): boolean {
  return (
    s.source === "claude-plugin-cache" || s.source === "codex-plugin-cache"
  );
}

export function aggregateSkills(skills: ParsedSkill[]): DisplaySkill[] {
  // 1. Collapse cache versions to latest per (marketplace, name).
  const latestCache = new Map<string, ParsedSkill>();
  const nonCache: ParsedSkill[] = [];
  for (const s of skills) {
    if (isCache(s)) {
      const key = `${s.marketplace ?? ""}:${s.name}`;
      const prev = latestCache.get(key);
      if (
        !prev ||
        (s.pluginVersion ?? "").localeCompare(prev.pluginVersion ?? "") > 0
      ) {
        latestCache.set(key, s);
      }
    } else {
      nonCache.push(s);
    }
  }

  // 2. Drop a cache entry when a non-cache entry of the same name exists.
  const nonCacheNames = new Set(nonCache.map((s) => s.name));
  const keptCache = [...latestCache.values()].filter(
    (s) => !nonCacheNames.has(s.name),
  );
  const kept = [...nonCache, ...keptCache];

  // 3. Group by realPath; merge surfaces.
  const byPath = new Map<string, DisplaySkill>();
  for (const s of kept) {
    const existing = byPath.get(s.realPath);
    if (existing) {
      if (!existing.surfaces.includes(s.surface))
        existing.surfaces.push(s.surface);
      continue;
    }
    byPath.set(s.realPath, {
      key: s.realPath,
      name: s.name,
      description: s.description,
      surfaces: [s.surface] as Surface[],
      source: s.source,
      marketplace: s.marketplace,
      pluginName: s.pluginName,
      keywords: dedupKeywords(s),
      primary: s,
    });
  }

  return [...byPath.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function dedupKeywords(s: ParsedSkill): string[] {
  const extra = [...s.triggerHints, s.marketplace ?? "", s.name].filter(
    Boolean,
  );
  return [...new Set([...s.keywords, ...extra.map((k) => k.toLowerCase())])];
}
