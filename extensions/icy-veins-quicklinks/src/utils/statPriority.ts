import { LocalStorage, Clipboard } from "@raycast/api";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  value: string;
  fetchedAt: number;
}

export function buildStatPriorityUrl(
  specSlug: string,
  pveRole: string,
): string {
  const roleMap: Record<string, string> = {
    dps: "dps",
    tank: "tank",
    healer: "healing",
  };
  const role = roleMap[pveRole] ?? "dps";
  return `https://www.icy-veins.com/wow/${specSlug}-pve-${role}-stat-priority`;
}

export function parseStatPriority(html: string): string | null {
  const listItemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const tagRegex = /<[^>]+>/g;

  const statKeywords =
    /intellect|strength|agility|stamina|critical|haste|mastery|versatility|speed|leech|avoidance/i;
  // Changelog entries look like "30 Nov. 2025: ..." or "04 Aug. 2025: ..."
  const changelogPattern = /^\d{1,2}\s+[A-Z][a-z]+\.?\s+\d{4}:/;

  const items: string[] = [];
  let match;
  while ((match = listItemRegex.exec(html)) !== null) {
    const text = match[1].replace(tagRegex, "").trim();
    // Stop as soon as we hit the changelog section
    if (changelogPattern.test(text)) break;
    if (statKeywords.test(text) && text.length < 100) {
      items.push(text);
    }
    if (items.length >= 6) break;
  }

  if (items.length < 2) return null;
  return items.join(" > ");
}

export async function fetchStatPriority(
  specSlug: string,
  pveRole: string,
): Promise<string | null> {
  const cacheKey = `stat-priority-v2:${specSlug}`;

  const cached = await LocalStorage.getItem<string>(cacheKey);
  if (cached) {
    try {
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.fetchedAt < CACHE_TTL) return entry.value;
    } catch {
      /* ignore */
    }
  }

  const url = buildStatPriorityUrl(specSlug, pveRole);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RaycastIVExtension/1.0)",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const result = parseStatPriority(html);

    if (result) {
      await LocalStorage.setItem(
        cacheKey,
        JSON.stringify({ value: result, fetchedAt: Date.now() }),
      );
    }
    return result;
  } catch {
    return null;
  }
}

export async function copyStatPriorityToClipboard(
  specSlug: string,
  pveRole: string,
): Promise<string | null> {
  const priority = await fetchStatPriority(specSlug, pveRole);
  if (priority) {
    await Clipboard.copy(priority);
  }
  return priority;
}
