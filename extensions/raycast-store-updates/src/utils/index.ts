import { Feed, FeedItem, GitHubPR, GitHubPRFile, StoreItem } from "../types";
import { Cache, Color, environment, getPreferenceValues, Icon, Image } from "@raycast/api";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fetchMergedPRsViaGraphQL, isGraphQLEnabled } from "./graphql";

export const RAW_CONTENT_BASE = "https://raw.githubusercontent.com/raycast/extensions/main/extensions";
export const FEED_URL = "https://www.raycast.com/store/feed.json";
export const GITHUB_PRS_URL =
  "https://api.github.com/repos/raycast/extensions/pulls?state=closed&sort=updated&direction=desc&per_page=50";

/**
 * Builds headers for GitHub REST API calls. When the optional `githubToken`
 * preference is set, an Authorization header is added, raising the rate limit
 * from 60 to 5,000 requests/hour. Falls back to unauthenticated access.
 */
export function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  try {
    const { githubToken } = getPreferenceValues<Preferences>();
    const token = githubToken?.trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Preferences unavailable — proceed unauthenticated.
  }
  return headers;
}

/**
 * Narrows an unknown JSON payload to an array.
 *
 * The GitHub API does NOT always answer an array-returning endpoint with an array.
 * On rate limits, auth failures, and (observed on Windows, where requests traverse a
 * system proxy) on 200-status proxy error pages, it answers with an object such as
 * `{ message, documentation_url }`. Casting that to `T[]` type-checks fine and then
 * throws `TypeError: e is not iterable` at the first `for...of`.
 *
 * Every fetch that feeds an iteration must route its payload through this.
 */
export function asArray<T>(payload: unknown): T[] {
  return Array.isArray(payload) ? (payload as T[]) : [];
}

// Platform icon tints.
//
// macOS uses the theme-aware Color enum, NOT a hex: "#000000CC" (80% black) rendered
// the Apple glyph near-invisible against Raycast's dark background, and the asset's own
// fill="currentColor" does not fix that — Raycast rasterizes a bundled asset with no
// inherited text color, so the tint has to come from here.
export const MACOS_TINT_COLOR = Color.PrimaryText;
export const WINDOWS_TINT_COLOR = "#0078D7"; // Windows brand blue

/**
 * Icon for each Raycast Store category.
 *
 * Raycast does not expose its Store category glyphs through the public API — none of the
 * 478 `Icon` members is named after a category, and no public endpoint serves them
 * (`/store/categories.json` returns the SPA's HTML). These are the closest built-ins,
 * which keeps them theme-aware instead of shipping copied artwork.
 *
 * Keys are the complete 15-value enum from Raycast's extension schema
 * (https://www.raycast.com/schemas/extension.json). Note it is "System", not
 * "System Tools" — a near-miss name silently falls through to the default icon.
 */
const CATEGORY_ICONS: Record<string, Icon> = {
  Applications: Icon.AppWindowGrid2x2,
  Communication: Icon.Megaphone,
  Data: Icon.MemoryChip,
  Documentation: Icon.Book,
  "Design Tools": Icon.Brush,
  "Developer Tools": Icon.Code,
  Finance: Icon.BankNote,
  Fun: Icon.GameController,
  Media: Icon.Video,
  News: Icon.Paragraph,
  Productivity: Icon.Gauge,
  Security: Icon.Lock,
  System: Icon.Cog,
  Web: Icon.Globe,
  Other: Icon.Ellipsis,
};

/** True when the optional GitHub token preference is set. */
export function hasGitHubToken(): boolean {
  try {
    return Boolean(getPreferenceValues<Preferences>().githubToken?.trim());
  } catch {
    return false;
  }
}

/**
 * A spend-once-per-call budget for billed API requests within a single scan.
 * `spend()` returns false once the allowance is gone, so callers degrade instead of
 * continuing to bill against a quota shared with every other command.
 */
export function createFilesBudget(limit: number): { spend: () => boolean } {
  let left = limit;
  return {
    spend: () => {
      if (left <= 0) return false;
      left--;
      return true;
    },
  };
}

/** Slugs asserted by Raycast's own `extension:` label — the one authoritative signal. */
function labelSlugs(pr: GitHubPR): string[] {
  return asArray<{ name: string }>(pr.labels)
    .map((l) => (typeof l?.name === "string" ? l.name.match(/^extension:\s*(.+)$/i)?.[1] : undefined))
    .filter((v): v is string => Boolean(v))
    .map((v) => v.trim().toLowerCase().replace(/\s+/g, "-"));
}

/**
 * The icon for an extension, as rendered in the list and the menu bar.
 *
 * Store icons are square PNGs with no corner radius of their own, so they read as hard
 * squares against Raycast's rounded UI. RoundedRectangle applies the platform's own
 * corner treatment — the same shape Raycast uses for app icons — and is a no-op on
 * assets that are already round.
 *
 * Shared so both surfaces stay identical; they drifted once already.
 */
export function extensionIconImage(item: StoreItem): Image {
  return { source: item.image, fallback: Icon.Box, mask: Image.Mask.RoundedRectangle };
}

/**
 * Fetches merged PRs, choosing exactly ONE transport.
 *
 * GraphQL when the user opted in AND supplied a token; REST otherwise, and REST again if
 * GraphQL fails for any reason. Callers must route through this rather than issuing their
 * own request — the view command previously let useFetch make the REST call and *then*
 * tried GraphQL in parseResponse, which spent both.
 *
 * Throws on a REST failure so callers can surface it; returns [] never means "error".
 */
export async function fetchMergedPRs(): Promise<GitHubPR[]> {
  if (isGraphQLEnabled()) {
    const viaGraphQL = await fetchMergedPRsViaGraphQL();
    if (viaGraphQL) return viaGraphQL;
  }
  const response = await fetch(GITHUB_PRS_URL, { headers: githubHeaders() });
  const resetHeader = response.headers.get("X-RateLimit-Reset");
  const remainingHeader = response.headers.get("X-RateLimit-Remaining");
  const remaining = remainingHeader != null ? parseInt(remainingHeader, 10) : undefined;

  // A genuine GitHub rate limit ALWAYS reports X-RateLimit-Remaining: 0. A bare 403
  // without it is a proxy/VPN/network rejection, and starting a cooldown for that would
  // lock the user out of quota they still have.
  if (response.status === 429 || (response.status === 403 && remaining === 0)) {
    const err = new Error("GitHub rate limit reached.") as Error & { rateLimitReset?: number };
    err.rateLimitReset = resetHeader ? parseInt(resetHeader, 10) : undefined;
    throw err;
  }
  if (response.status === 403) {
    throw new Error("GitHub refused the request (403). This is not a rate limit — check any VPN or proxy.");
  }
  if (!response.ok) {
    throw new Error(`GitHub responded ${response.status} ${response.statusText}`);
  }

  // A 200 is not a promise of parseable JSON, let alone an array: on Windows requests
  // traverse a system proxy that can answer with an HTML error page or an empty body
  // carrying a 200. response.json() throws SyntaxError BEFORE any shape check could run,
  // so the parse itself must be guarded — this is the reported "e is not iterable" crash.
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`GitHub returned a ${response.status} response that was not valid JSON.`);
  }
  if (!Array.isArray(payload)) {
    throw new Error(
      typeof payload === "object" && payload !== null && typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : "GitHub returned an unexpected response shape.",
    );
  }
  return payload as GitHubPR[];
}

/**
 * Which platforms an item supports. Absent platform data means macOS-only — Raycast's
 * pre-Windows default. Stated once here so the list, the detail panel, and the filter
 * can't drift to three separately-written default policies.
 */
export function platformSupport(platforms: string[] | undefined): { hasMac: boolean; hasWindows: boolean } {
  const list = platforms ?? ["macOS"];
  return {
    hasMac: list.some((p) => p.toLowerCase() === "macos"),
    hasWindows: list.some((p) => p.toLowerCase() === "windows"),
  };
}

/** "hyper-key" -> "Hyper Key". Fallback when package.json carries no title. */
function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** GitHub URL for an extension's CHANGELOG.md. */
export function changelogUrl(slug: string): string {
  return `https://github.com/raycast/extensions/blob/main/extensions/${slug}/CHANGELOG.md`;
}

/** Icon for a category, falling back gracefully for unknown/future names. */
export function categoryIcon(category: string): Icon {
  return CATEGORY_ICONS[category] ?? Icon.Tag;
}

// Raycast Store category colors, keyed by the canonical category names.
export const CATEGORY_COLORS: Record<string, string> = {
  Applications: "#8E44AD",
  Communication: "#E67E22",
  Data: "#16A085",
  Documentation: "#7F8C8D",
  "Design Tools": "#E91E63",
  "Developer Tools": "#2980B9",
  Finance: "#27AE60",
  Fun: "#F39C12",
  Media: "#E74C3C",
  News: "#3498DB",
  Productivity: "#9B59B6",
  Security: "#C0392B",
  System: "#34495E",
  Web: "#1ABC9C",
  Other: "#95A5A6",
};

/**
 * Runs an async mapper over `items` with a bounded number of concurrent
 * executions, preserving input order in the result. Prevents opening dozens of
 * sockets at once (e.g. when enriching every feed item with its package.json).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    for (let index = cursor++; index < items.length; index = cursor++) {
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Parses the Raycast Store URL to extract author and extension name.
 * URL format: https://www.raycast.com/{author}/{extension}
 */
export function parseExtensionUrl(url: string): { author: string; extension: string } | null {
  if (!url || !url.startsWith("https://www.raycast.com/")) {
    return null;
  }
  const path = url.replace("https://www.raycast.com/", "");
  const [author, extension] = path.split("/");
  if (!author || !extension) {
    return null;
  }
  return { author, extension };
}

/**
 * Creates a Raycast deeplink to open an extension in the Store.
 * Format: raycast://extensions/{author}/{extension}
 * Returns original URL if parsing fails.
 */
export function createStoreDeeplink(url: string): string {
  const parsed = parseExtensionUrl(url);
  if (!parsed) {
    return url;
  }
  return `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/${parsed.author}/${parsed.extension}`;
}

/**
 * Attempts to extract the extension slug from a GitHub PR title.
 * Common PR title patterns:
 *   - "Extension Name: description"
 *   - "[Extension Name] description"
 *   - "Update extension-name"
 * Returns null if we can't reliably determine it.
 */
export function parseExtensionSlugFromPR(pr: GitHubPR): string | null {
  // Check labels for extension slug (some PRs have "extension: name" labels)
  for (const label of asArray<{ name: string }>(pr.labels)) {
    if (typeof label?.name !== "string") continue;
    const match = label.name.match(/^extension:\s*(.+)$/i);
    if (match) return match[1].trim().toLowerCase().replace(/\s+/g, "-");
  }

  const title = pr.title;

  // Pattern: "Extension Name: description" or "extension-name: description"
  const colonMatch = title.match(/^([^:]+):\s/);
  if (colonMatch) {
    const name = colonMatch[1].trim();
    // Skip common prefixes that aren't extension names
    if (!/^(fix|feat|chore|docs|ci|build|refactor|test|style|perf|revert|bump|update|add|remove|merge)/i.test(name)) {
      return name.toLowerCase().replace(/\s+/g, "-");
    }
  }

  // Pattern: "[Extension Name] description"
  const bracketMatch = title.match(/^\[([^\]]+)\]/);
  if (bracketMatch) {
    return bracketMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
  }

  // Pattern: head branch "ext/<slug>" — Raycast's contribution convention, and already
  // an exact slug. Free: the PR list response carries it, so this avoids a /files call.
  const headRef = pr.head?.ref;
  if (typeof headRef === "string") {
    const refMatch = headRef.match(/^ext\/(.+)$/);
    if (refMatch) return refMatch[1].trim().toLowerCase();
  }

  // Pattern: "Add <name> extension" — new-extension submissions. The colon rule above
  // deliberately rejects a leading "Add", so these would otherwise fall through to the
  // billed /files lookup despite naming the extension right in the title.
  const addMatch = title.match(/^add\s+(.+?)\s+extension\s*$/i);
  if (addMatch) {
    return addMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
  }

  return null;
}

/**
 * Returns true if a PR is a candidate for extension removal.
 * Uses the "no-review" label (Raycast's housekeeping label) or a removal-pattern title.
 */
export function isRemovalPR(pr: GitHubPR): boolean {
  if (asArray<{ name: string }>(pr.labels).some((l) => l?.name === "no-review")) return true;
  return typeof pr.title === "string" && /^removed?\b/i.test(pr.title);
}

/**
 * Fetches the file list for a GitHub PR and extracts the extension slug
 * from the file paths. Files follow the pattern: extensions/{slug}/...
 * Returns the most common slug found, or null if none.
 */
export async function fetchExtensionSlugFromPRFiles(prNumber: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/raycast/extensions/pulls/${prNumber}/files?per_page=100`,
      {
        headers: githubHeaders(),
      },
    );
    if (!response.ok) return null;
    const files = asArray<GitHubPRFile>(await response.json());

    // Extract slugs from file paths like "extensions/{slug}/..."
    const slugCounts = new Map<string, number>();
    for (const file of files) {
      const match = file.filename.match(/^extensions\/([^/]+)\//);
      if (match) {
        const slug = match[1];
        slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
      }
    }

    if (slugCounts.size === 0) return null;

    // Return the slug with the most file changes (handles PRs touching multiple extensions)
    let bestSlug = "";
    let bestCount = 0;
    for (const [slug, count] of slugCounts) {
      if (count > bestCount) {
        bestSlug = slug;
        bestCount = count;
      }
    }
    return bestSlug || null;
  } catch {
    return null;
  }
}

/**
 * Fetches all extension slugs whose files were entirely deleted in a PR.
 * A slug is considered removed if every file under extensions/{slug}/ has status "removed".
 * Returns an array of removed slugs (may be empty).
 */
export async function fetchRemovedSlugsFromPR(prNumber: number): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/raycast/extensions/pulls/${prNumber}/files?per_page=100`,
      {
        headers: githubHeaders(),
      },
    );
    if (!response.ok) return [];
    const files = asArray<GitHubPRFile>(await response.json());

    // Group files by slug
    const slugFiles = new Map<string, GitHubPRFile[]>();
    for (const file of files) {
      const match = file.filename.match(/^extensions\/([^/]+)\//);
      if (match) {
        const slug = match[1];
        const existing = slugFiles.get(slug) ?? [];
        existing.push(file);
        slugFiles.set(slug, existing);
      }
    }

    // A slug is removed if ALL its files have status "removed"
    const removedSlugs: string[] = [];
    for (const [slug, slugFileList] of slugFiles) {
      if (slugFileList.length > 0 && slugFileList.every((f) => f.status === "removed")) {
        removedSlugs.push(slug);
      }
    }
    return removedSlugs;
  } catch {
    return [];
  }
}

/**
 * Extracts the most recent changelog section from a CHANGELOG.md string.
 * Looks for the first ## heading and returns content until the next ## heading.
 */
export function extractLatestChanges(changelog: string): string {
  const lines = changelog.split("\n");
  let started = false;
  const result: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (started) break; // We've hit the next section
      started = true;
      result.push(line);
      continue;
    }
    if (started) {
      result.push(line);
    }
  }

  return result.join("\n").trim();
}

export interface ExtensionPackageInfo {
  owner: string;
  title: string;
  name: string;
  description: string;
  platforms: string[];
  version: string;
  categories: string[];
  icon: string;
}

const packageInfoCache = new Cache({ namespace: "store-updates-package-info" });
const PACKAGE_INFO_TTL_MS = 6 * 60 * 60 * 1000; // 6h for resolved extensions (metadata changes rarely)
const PACKAGE_INFO_MISS_TTL_MS = 15 * 60 * 1000; // 15m for 404s (a new extension may appear soon)
const inFlightPackageInfo = new Map<string, Promise<ExtensionPackageInfo | null>>();

interface CachedPackageInfo {
  ts: number;
  data: ExtensionPackageInfo | null;
}

/**
 * Fetches the package.json for an extension to get the correct owner/title.
 * Results are cached (persistent, with a TTL) and concurrent requests for the
 * same slug are de-duplicated. Returns extension metadata or null if not found.
 */
export async function fetchExtensionPackageInfo(slug: string): Promise<ExtensionPackageInfo | null> {
  if (!slug) return null;

  // Serve from the persistent cache when still fresh.
  const cachedRaw = packageInfoCache.get(slug);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as CachedPackageInfo;
      const ttl = cached.data ? PACKAGE_INFO_TTL_MS : PACKAGE_INFO_MISS_TTL_MS;
      if (Date.now() - cached.ts < ttl) return cached.data;
    } catch {
      // Corrupt cache entry — fall through and refetch.
    }
  }

  // De-duplicate concurrent requests for the same slug within a run.
  const inFlight = inFlightPackageInfo.get(slug);
  if (inFlight) return inFlight;

  const request = (async (): Promise<ExtensionPackageInfo | null> => {
    try {
      const response = await fetch(`${RAW_CONTENT_BASE}/${slug}/package.json`);
      if (!response.ok) {
        packageInfoCache.set(slug, JSON.stringify({ ts: Date.now(), data: null } satisfies CachedPackageInfo));
        return null;
      }
      const pkg = (await response.json()) as {
        owner?: string;
        title?: string;
        name?: string;
        author?: string;
        description?: string;
        platforms?: unknown;
        version?: string;
        categories?: unknown;
        icon?: string;
      };
      // Validate remote-controlled fields: never trust that arrays are arrays of strings.
      const platforms = Array.isArray(pkg.platforms)
        ? pkg.platforms.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        : [];
      const categories = Array.isArray(pkg.categories)
        ? pkg.categories.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        : [];
      const info: ExtensionPackageInfo = {
        owner: pkg.owner ?? pkg.author ?? slug,
        title: pkg.title ?? pkg.name ?? slug,
        name: pkg.name ?? slug,
        description: pkg.description ?? "",
        platforms: platforms.length > 0 ? platforms : ["macOS"],
        version: pkg.version ?? "",
        categories,
        icon: pkg.icon ?? "",
      };
      packageInfoCache.set(slug, JSON.stringify({ ts: Date.now(), data: info } satisfies CachedPackageInfo));
      return info;
    } catch {
      // Network/parse error: don't cache, allow a later retry.
      return null;
    } finally {
      inFlightPackageInfo.delete(slug);
    }
  })();

  inFlightPackageInfo.set(slug, request);
  return request;
}

/**
 * Builds the URL for an extension's icon from the GitHub repo.
 */
export function getExtensionIconUrl(slug: string, iconFilename: string): string {
  if (!iconFilename) return "";
  return `${RAW_CONTENT_BASE}/${slug}/${iconFilename.startsWith("assets/") ? iconFilename : `assets/${iconFilename}`}`;
}

/**
 * Confirms an extension is genuinely gone from the monorepo.
 *
 * Returns a TRI-STATE, not a boolean. "present" and "unknown" are different answers:
 * the first is a fact worth sharing between concurrent PRs, the second is an absence
 * of information that must not be. Collapsing them into `false` is what let a
 * transient error on one PR suppress a sibling PR's genuine 404.
 *
 * Only a definitive 404 proves removal. fetchExtensionPackageInfo() collapses EVERY
 * failure to null — a 500, a network error, a malformed body — and additionally caches
 * that miss for 15 minutes, so using it here would let one transient blip display a live
 * extension as "Removed" and keep doing so. Anything that is not an explicit 404 is
 * treated as "still exists": a missed removal is invisible, a false removal is a wrong
 * claim on screen. (Reported by Greptile on raycast/extensions#29819.)
 */
type RemovalCheck = "gone" | "present" | "unknown";

async function isExtensionGone(slug: string): Promise<RemovalCheck> {
  try {
    const response = await fetch(`${RAW_CONTENT_BASE}/${slug}/package.json`, { method: "HEAD" });
    if (response.status === 404) return "gone";
    if (response.ok) return "present";
    // 5xx, 429, anything else: we did not learn whether it is gone.
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Converts merged GitHub PRs into StoreItems, separated into updated and removed.
 * Filters for only merged PRs and deduplicates by extension slug.
 * Fetches package.json for each update to get the correct store owner.
 * Detects removal PRs via isRemovalPR() and confirms via package.json 404.
 * @param newItemDates Maps extension slugs from the "new" feed to their publish dates.
 *   PRs merged after the feed date are treated as updates; older ones are skipped as duplicates.
 */
export async function convertPRsToStoreItems(
  prs: GitHubPR[],
  newItemDates: Map<string, string>,
): Promise<{ updated: StoreItem[]; removed: StoreItem[] }> {
  // Per-scan ceiling on billed `/pulls/{n}/files` requests. Unauthenticated callers get
  // 60 requests/hour TOTAL across every command and every refresh, so an uncapped
  // fallback (one request per unresolved PR) can spend half the budget in a single
  // scan. With a token the ceiling is 5,000/hour and the cap can be far looser.
  const filesBudget = createFilesBudget(hasGitHubToken() ? 50 : 5);

  const seen = new Set<string>();
  const updateCandidates: { pr: GitHubPR; slug: string }[] = [];
  const removalCandidatePRs: GitHubPR[] = [];
  const needsFileFallback: GitHubPR[] = [];

  // First pass: parse slugs from titles, classify PRs
  for (const pr of prs) {
    if (!pr.merged_at) continue;

    if (isRemovalPR(pr)) {
      removalCandidatePRs.push(pr);
      continue;
    }

    const slug = parseExtensionSlugFromPR(pr);
    if (slug) {
      // Skip if this extension is in the "new" list and the PR is not newer
      const feedDate = newItemDates.get(slug);
      if (feedDate && new Date(pr.merged_at).getTime() <= new Date(feedDate).getTime()) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      updateCandidates.push({ pr, slug });
    } else {
      needsFileFallback.push(pr);
    }
  }

  // Batch fetch file-based slugs for regular update PRs with bounded concurrency
  if (needsFileFallback.length > 0) {
    // Same budget as the removal path below: each of these is one billed request.
    const slugResults = await mapWithConcurrency(needsFileFallback, 8, async (pr) => ({
      pr,
      slug: filesBudget.spend() ? await fetchExtensionSlugFromPRFiles(pr.number) : null,
    }));

    for (const { pr, slug } of slugResults) {
      if (!slug) continue;
      const feedDate = newItemDates.get(slug);
      if (feedDate && new Date(pr.merged_at!).getTime() <= new Date(feedDate).getTime()) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      updateCandidates.push({ pr, slug });
    }
  }

  // Fetch package.json for all update candidates with bounded concurrency
  const updatedItems = await mapWithConcurrency(updateCandidates, 8, async ({ pr, slug }) => {
    let resolvedSlug = slug;
    let pkgInfo = await fetchExtensionPackageInfo(resolvedSlug);

    // The title-derived slug may not match the real folder name (e.g. display
    // name != slug). Fall back to the authoritative slug from the PR's changed
    // file paths before emitting an item with a guessed store URL.
    if (!pkgInfo) {
      // Try the OTHER free signals first. Each is a raw.githubusercontent lookup, which
      // is not billed against GitHub's 60/hr API quota, whereas fetchExtensionSlugFromPRFiles
      // costs one API request PER PR. Before this ordering a scan could spend ~29 billed
      // requests — two scans exhausted the hourly budget for an unauthenticated user.
      // ONLY the `extension:` label is trusted here. "extensions/<candidate>/package.json
      // exists" proves the extension exists, NOT that it belongs to this PR — a branch
      // named `ext/foo` on a PR touching something else would otherwise adopt foo's Store
      // URL and changelog. The label is set by Raycast's own tooling, so it is the one
      // signal that actually asserts ownership. Weaker guesses fall through to /files.
      for (const candidate of labelSlugs(pr)) {
        if (candidate === resolvedSlug) continue;
        const candidateInfo = await fetchExtensionPackageInfo(candidate);
        if (candidateInfo) {
          resolvedSlug = candidate;
          pkgInfo = candidateInfo;
          break;
        }
      }
    }

    // Only now, having exhausted every free signal, spend an API request — and only
    // while the per-scan budget lasts. Without this cap a scan where many lookups miss
    // costs one billed request per PR (measured: 29), so two scans exhaust the 60/hour
    // unauthenticated quota and the extension locks itself out. A PR that misses the
    // budget simply keeps its title-derived slug, which is the pre-existing behaviour.
    if (!pkgInfo && filesBudget.spend()) {
      const fileSlug = await fetchExtensionSlugFromPRFiles(pr.number);
      if (fileSlug && fileSlug !== resolvedSlug) {
        const filePkgInfo = await fetchExtensionPackageInfo(fileSlug);
        if (filePkgInfo) {
          resolvedSlug = fileSlug;
          pkgInfo = filePkgInfo;
        }
      }
    }

    const owner = pkgInfo?.owner ?? pr.user.login;
    const title = pkgInfo?.title ?? titleFromSlug(resolvedSlug);

    const description = pkgInfo?.description ?? pr.title;
    const iconUrl = pkgInfo?.icon ? getExtensionIconUrl(resolvedSlug, pkgInfo.icon) : "";

    return {
      id: `pr-${pr.number}`,
      title,
      summary: description,
      image: iconUrl || pr.user.avatar_url,
      date: pr.merged_at!,
      authorName: pr.user.login,
      authorUrl: pr.user.html_url,
      url: `https://www.raycast.com/${owner}/${resolvedSlug}`,
      type: "updated" as const,
      extensionSlug: resolvedSlug,
      prUrl: pr.html_url,
      platforms: pkgInfo?.platforms ?? ["macOS"],
      version: pkgInfo?.version,
      categories: pkgInfo?.categories,
      extensionIcon: pkgInfo?.icon,
    };
  });

  // Process removal PRs: fetch their deleted slugs, confirm via 404, emit one item per slug.
  //
  // Keyed by slug, this memoizes the in-flight confirmation rather than merely recording
  // "seen". A Set cannot express what is needed: two removal PRs deleting the same
  // extension run concurrently, and the second reaches its check BEFORE the first's
  // confirmation resolves, so with a Set the second skips outright.
  //
  // The memoized value must be a TRI-STATE. A boolean conflates "present" with "could
  // not tell", and sharing that ambiguity reproduces the bug in a new shape: a transient
  // 5xx on whichever PR wins the race would be inherited by a sibling that would have
  // received a real 404. Only a DEFINITIVE answer ("gone" / "present") is worth sharing;
  // "unknown" is discarded so the next PR for that slug retries independently.
  const removalConfirmations = new Map<string, Promise<RemovalCheck>>();
  const removalResults = await mapWithConcurrency(removalCandidatePRs, 8, async (pr) => {
    // Budgeted like every other /files call — removal PRs were previously exempt, so a
    // scan with six removals issued six billed requests despite the cap.
    if (!filesBudget.spend()) return [];
    const slugs = await fetchRemovedSlugsFromPR(pr.number);
    const items: StoreItem[] = [];
    for (const slug of slugs) {
      // Only the PR that starts the confirmation may emit; a concurrent PR for the same
      // slug awaits the same promise and stays silent. That gives dedup (one item) and
      // retry-safety (a transient failure does not suppress the other PR's answer,
      // because there is only ever one answer).
      // Resolve this slug to a definitive verdict, retrying past inconclusive answers.
      //
      // The loop is load-bearing. A sibling PR reaches this point while the owner's
      // confirmation is still in flight, so it cannot simply skip — by the time the
      // owner discovers "unknown" and clears the entry, a skipping sibling has already
      // moved on and the genuine removal is lost. Awaiting the shared promise and
      // looping means whoever is still here retries, while a definitive answer is
      // resolved exactly once and shared.
      let verdict: RemovalCheck = "unknown";
      let owned = false;
      for (;;) {
        const inFlight = removalConfirmations.get(slug);
        if (inFlight) {
          const shared = await inFlight;
          if (shared !== "unknown") {
            verdict = shared; // someone else got a definitive answer; they emit, not us
            break;
          }
          // Inconclusive and already cleared by its owner — fall through and retry.
          if (removalConfirmations.get(slug) === inFlight) removalConfirmations.delete(slug);
          continue;
        }
        const confirmation = isExtensionGone(slug);
        removalConfirmations.set(slug, confirmation);
        verdict = await confirmation;
        if (verdict === "unknown") {
          removalConfirmations.delete(slug);
          break; // our own attempt failed; do not spin on a persistent outage
        }
        owned = true; // we produced the definitive answer, so we are the one who emits
        break;
      }
      if (!owned || verdict !== "gone") continue;
      const title = titleFromSlug(slug);
      items.push({
        id: `pr-${pr.number}-removed-${slug}`,
        title,
        summary: `This extension has been removed from the Raycast Store.`,
        image: pr.user.avatar_url,
        date: pr.merged_at!,
        authorName: pr.user.login,
        authorUrl: pr.user.html_url,
        url: pr.html_url,
        type: "removed" as const,
        extensionSlug: slug,
        prUrl: pr.html_url,
        platforms: ["macOS"],
      });
    }
    return items;
  });

  const removedItems = removalResults.flat();

  return { updated: updatedItems, removed: removedItems };
}

/**
 * Self-contained scan used by the menu-bar command (and background refreshes).
 * Fetches the feed + merged PRs and returns the combined new + updated items,
 * sorted newest-first. New items use feed fields directly (no extra network);
 * updated items reuse convertPRsToStoreItems. Removed items are intentionally
 * omitted — the menu bar surfaces things to discover, not removals.
 */
export async function scanStoreUpdates(): Promise<StoreItem[]> {
  const [feed, prs] = await Promise.all([
    (async (): Promise<Feed | null> => {
      try {
        const response = await fetch(FEED_URL);
        if (!response.ok) return null;
        return (await response.json()) as Feed;
      } catch {
        return null;
      }
    })(),
    (async (): Promise<GitHubPR[] | null> => {
      // One transport, chosen by fetchMergedPRs. The background scan has no UI to show an
      // error in, so any failure degrades to null and the cached items stay.
      try {
        return await fetchMergedPRs();
      } catch {
        return null;
      }
    })(),
  ]);

  const newItems: StoreItem[] = asArray<FeedItem>(feed?.items)
    .map((item): StoreItem | null => {
      const parsed = parseExtensionUrl(item.url);
      if (!parsed) return null;
      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        image: item.image,
        date: item.date_modified,
        authorName: item.author.name,
        authorUrl: item.author.url,
        url: item.url,
        type: "new",
        extensionSlug: parsed.extension,
      };
    })
    .filter((item): item is StoreItem => item !== null);

  const newItemDates = new Map<string, string>();
  for (const item of newItems) {
    if (item.extensionSlug) newItemDates.set(item.extensionSlug, item.date);
  }

  let updatedItems: StoreItem[] = [];
  if (prs) {
    const { updated } = await convertPRsToStoreItems(prs, newItemDates);
    updatedItems = updated;
  }

  return [...newItems, ...updatedItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Gets the set of installed extension slugs by reading from the Raycast
 * support directory. Each extension directory contains a package.json with a
 * `name` field.
 *
 * The location is derived relatively from environment.assetsPath
 * (.../extensions/<ext-id>/assets -> .../extensions) so it does not hardcode a
 * platform-specific path. On macOS this resolves under
 * ~/Library/Application Support/com.raycast.macos/extensions/; the Windows
 * layout has not been verified, so callers should treat an empty result as
 * "unknown" rather than "no matching extensions" on Windows.
 */
export function getInstalledExtensionSlugs(): Set<string> {
  const slugs = new Set<string>();

  try {
    // environment.assetsPath is like:
    // ~/Library/Application Support/com.raycast.macos/extensions/<ext-id>/assets
    // We go up to the extensions directory
    const assetsPath = environment.assetsPath;
    const extensionsDir = dirname(dirname(assetsPath));

    if (!existsSync(extensionsDir)) return slugs;

    const entries = readdirSync(extensionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(extensionsDir, entry.name, "package.json");
      try {
        if (!existsSync(pkgPath)) continue;
        const raw = readFileSync(pkgPath, "utf-8");
        const pkg = JSON.parse(raw) as { name?: string };
        if (pkg.name) {
          slugs.add(pkg.name);
        }
      } catch {
        // Skip unreadable extensions
      }
    }
  } catch {
    // If we can't read the directory, return empty set
  }

  return slugs;
}
