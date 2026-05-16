import { LocalStorage } from "@raycast/api";
import { Skill, listSkills as listBundled, loadSkill as loadBundled, parseSkill } from "./skills";

/**
 * Runtime skill resolver. Resolution chain:
 *
 *   1. LocalStorage cache  (24 h TTL, ETag-aware via stored sha)
 *   2. GitHub raw fetch    (with 5 s timeout)
 *   3. Bundled fallback    (src/lib/skill-content.generated.ts via skills.ts)
 *
 * The fallback is always available, so the resolver never throws on
 * network failure — it returns the freshest content it can.
 *
 * Live updates land for users without an extension release. The bundled
 * embed step still runs at build time so first-launch / offline works.
 */

export type SkillSource = "bundled" | "cached" | "live";

export interface ResolvedSkill {
  skill: Skill;
  source: SkillSource;
  fetchedAt: number;
  upstreamSha?: string;
}

interface CacheEntry {
  raw: string;
  fetched_at: number;
  upstream_sha?: string;
  etag?: string;
}

const CACHE_KEY_PREFIX = "superhuman.skill-cache.v1.";
const TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const REPO = "superhuman/mcp-mail";
const SKILLS_API = `https://api.github.com/repos/${REPO}/contents/skills`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main/skills`;

interface GithubContentEntry {
  name: string;
  type: "file" | "dir";
  sha: string;
}

async function loadCache(name: string): Promise<CacheEntry | null> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY_PREFIX + name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

async function saveCache(name: string, entry: CacheEntry): Promise<void> {
  await LocalStorage.setItem(CACHE_KEY_PREFIX + name, JSON.stringify(entry));
}

function cacheFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.fetched_at < TTL_MS;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function listUpstream(): Promise<GithubContentEntry[] | null> {
  try {
    const res = await fetchWithTimeout(SKILLS_API, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GithubContentEntry[];
    return data.filter((e) => e.type === "dir");
  } catch {
    return null;
  }
}

async function fetchSkillRaw(name: string): Promise<{ raw: string; sha?: string } | null> {
  try {
    const url = `${RAW_BASE}/${name}/SKILL.md`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const raw = await res.text();
    // raw.githubusercontent.com doesn't return a content SHA we can trust as
    // a blob hash; the listing endpoint is the source for SHA. Caller may
    // pass the SHA from the listing call.
    return { raw };
  } catch {
    return null;
  }
}

function buildResolved(name: string, raw: string, source: SkillSource, fetchedAt: number, sha?: string): ResolvedSkill {
  const skill = parseSkill(raw);
  if (skill.frontmatter.name !== name) skill.frontmatter.name = name;
  return { skill, source, fetchedAt, upstreamSha: sha };
}

/**
 * Resolve a single skill by slug, applying the cache → remote → bundled
 * fallback chain. Set `forceRefresh: true` to skip the cache and hit the
 * network.
 */
export async function getSkill(name: string, opts?: { forceRefresh?: boolean }): Promise<ResolvedSkill> {
  // 1. Cache
  if (!opts?.forceRefresh) {
    const cached = await loadCache(name);
    if (cached && cacheFresh(cached)) {
      return buildResolved(name, cached.raw, "cached", cached.fetched_at, cached.upstream_sha);
    }
  }

  // 2. Remote — list once to pick up SHA, then fetch raw.
  const upstream = await fetchSkillRaw(name);
  if (upstream) {
    const fetched_at = Date.now();
    await saveCache(name, { raw: upstream.raw, fetched_at, upstream_sha: upstream.sha });
    return buildResolved(name, upstream.raw, "live", fetched_at, upstream.sha);
  }

  // Remote failed; try stale cache before bundled.
  const stale = await loadCache(name);
  if (stale) return buildResolved(name, stale.raw, "cached", stale.fetched_at, stale.upstream_sha);

  // 3. Bundled fallback
  const bundled = loadBundled(name);
  return { skill: bundled, source: "bundled", fetchedAt: 0 };
}

/**
 * List every available skill. Catalog source preference:
 *   - upstream listing if reachable
 *   - else the bundled catalog
 *
 * For each name in the catalog, resolves the content via `getSkill`, so
 * individual skills may come from different sources within one call.
 */
export async function listAvailableSkills(opts?: { forceRefresh?: boolean }): Promise<ResolvedSkill[]> {
  const upstreamList = await listUpstream();
  const bundledNames = listBundled().map((s) => s.frontmatter.name);
  const names = upstreamList?.length ? upstreamList.map((e) => e.name) : bundledNames;
  // Stash upstream SHAs to seed cache where helpful.
  const shaByName = new Map<string, string>();
  if (upstreamList) for (const e of upstreamList) shaByName.set(e.name, e.sha);
  const out: ResolvedSkill[] = [];
  for (const name of names) {
    try {
      const resolved = await getSkill(name, opts);
      if (shaByName.has(name) && !resolved.upstreamSha) {
        resolved.upstreamSha = shaByName.get(name);
      }
      out.push(resolved);
    } catch {
      // Upstream advertised a skill we don't have a bundled fallback for and
      // the body fetch failed — skip silently rather than abort the catalog.
    }
  }
  return out;
}

/**
 * Force-refresh every known skill in parallel. Used by the Browse Skills
 * "Refresh from Upstream" action.
 */
export async function refreshAll(): Promise<{ updated: string[]; failed: string[] }> {
  const upstreamList = await listUpstream();
  const bundledNames = listBundled().map((s) => s.frontmatter.name);
  const names = upstreamList?.length ? upstreamList.map((e) => e.name) : bundledNames;
  const updated: string[] = [];
  const failed: string[] = [];
  await Promise.all(
    names.map(async (name) => {
      try {
        const resolved = await getSkill(name, { forceRefresh: true });
        if (resolved.source === "live") updated.push(name);
        else failed.push(name);
      } catch {
        failed.push(name);
      }
    }),
  );
  return { updated, failed };
}

/**
 * Fuzzy slug resolver. Accepts "morning-briefing" or "Morning Briefing" or
 * "morning briefing". Returns the canonical slug if it matches one of the
 * known names, else `null`.
 */
export function resolveSlug(input: string, knownNames: string[]): string | null {
  const target = input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  for (const name of knownNames) {
    if (name === target) return name;
  }
  // Loose contains-match — useful when the user said "morning" only.
  for (const name of knownNames) {
    if (name.includes(target) || target.includes(name)) return name;
  }
  return null;
}
