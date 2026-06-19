import { Feed, GitHubPR, GitHubPRFile, StoreItem } from "../types";
import { Cache, environment, getPreferenceValues } from "@raycast/api";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

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

// Platform icon colors (tintColor format)
export const MACOS_TINT_COLOR = "#000000CC"; // 80% black
export const WINDOWS_TINT_COLOR = "#0078D7"; // Windows blue

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
  for (const label of pr.labels) {
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

  return null;
}

/**
 * Returns true if a PR is a candidate for extension removal.
 * Uses the "no-review" label (Raycast's housekeeping label) or a removal-pattern title.
 */
export function isRemovalPR(pr: GitHubPR): boolean {
  if (pr.labels.some((l) => l.name === "no-review")) return true;
  return /^removed?\b/i.test(pr.title);
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
    const files = (await response.json()) as GitHubPRFile[];

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
    const files = (await response.json()) as GitHubPRFile[];

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
    const slugResults = await mapWithConcurrency(needsFileFallback, 8, async (pr) => ({
      pr,
      slug: await fetchExtensionSlugFromPRFiles(pr.number),
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
    const title =
      pkgInfo?.title ??
      resolvedSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

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

  // Process removal PRs: fetch their deleted slugs, confirm via 404, emit one item per slug
  const removedSeen = new Set<string>();
  const removalResults = await mapWithConcurrency(removalCandidatePRs, 8, async (pr) => {
    const slugs = await fetchRemovedSlugsFromPR(pr.number);
    const items: StoreItem[] = [];
    for (const slug of slugs) {
      if (removedSeen.has(slug)) continue;
      // Confirm the extension is truly gone (package.json 404)
      const pkgInfo = await fetchExtensionPackageInfo(slug);
      if (pkgInfo !== null) continue; // Still exists — not actually removed
      removedSeen.add(slug);
      const title = slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
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
      try {
        const response = await fetch(GITHUB_PRS_URL, { headers: githubHeaders() });
        if (!response.ok) return null;
        return (await response.json()) as GitHubPR[];
      } catch {
        return null;
      }
    })(),
  ]);

  const newItems: StoreItem[] = (feed?.items ?? [])
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
