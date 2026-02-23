import { GitHubPR, StoreItem } from "../types";
import { environment } from "@raycast/api";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const RAW_CONTENT_BASE = "https://raw.githubusercontent.com/raycast/extensions/main/extensions";

// Platform icon colors (tintColor format)
export const MACOS_TINT_COLOR = "#000000CC"; // 80% black
export const WINDOWS_TINT_COLOR = "#0078D7"; // Windows blue

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
  return `raycast://extensions/${parsed.author}/${parsed.extension}`;
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
 * Fetches the file list for a GitHub PR and extracts the extension slug
 * from the file paths. Files follow the pattern: extensions/{slug}/...
 * Returns the most common slug found, or null if none.
 */
export async function fetchExtensionSlugFromPRFiles(prNumber: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/raycast/extensions/pulls/${prNumber}/files?per_page=10`,
      { headers: { Accept: "application/vnd.github.v3+json" } },
    );
    if (!response.ok) return null;
    const files = (await response.json()) as { filename: string }[];

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

/**
 * Fetches the package.json for an extension to get the correct owner/title.
 * Returns extension metadata or null if not found.
 */
export async function fetchExtensionPackageInfo(slug: string): Promise<{
  owner: string;
  title: string;
  name: string;
  description: string;
  platforms: string[];
  version: string;
  categories: string[];
  icon: string;
} | null> {
  try {
    const response = await fetch(`${RAW_CONTENT_BASE}/${slug}/package.json`);
    if (!response.ok) return null;
    const pkg = (await response.json()) as {
      owner?: string;
      title?: string;
      name?: string;
      author?: string;
      description?: string;
      platforms?: string[];
      version?: string;
      categories?: string[];
      icon?: string;
    };
    const owner = pkg.owner ?? pkg.author ?? slug;
    const title = pkg.title ?? pkg.name ?? slug;
    const name = pkg.name ?? slug;
    const description = pkg.description ?? "";
    const platforms = pkg.platforms ?? ["macOS"];
    const version = pkg.version ?? "";
    const categories = (pkg.categories ?? []).filter((c) => typeof c === "string" && c.trim().length > 0);
    const icon = pkg.icon ?? "";
    return { owner, title, name, description, platforms, version, categories, icon };
  } catch {
    return null;
  }
}

/**
 * Builds the URL for an extension's icon from the GitHub repo.
 */
export function getExtensionIconUrl(slug: string, iconFilename: string): string {
  if (!iconFilename) return "";
  return `${RAW_CONTENT_BASE}/${slug}/${iconFilename.startsWith("assets/") ? iconFilename : `assets/${iconFilename}`}`;
}

/**
 * Converts merged GitHub PRs into StoreItems.
 * Filters for only merged PRs and deduplicates by extension slug.
 * Fetches package.json for each to get the correct store owner.
 * @param newItemDates Maps extension slugs from the "new" feed to their publish dates.
 *   PRs merged after the feed date are treated as updates; older ones are skipped as duplicates.
 */
export async function convertPRsToStoreItems(prs: GitHubPR[], newItemDates: Map<string, string>): Promise<StoreItem[]> {
  const seen = new Set<string>();
  const candidates: { pr: GitHubPR; slug: string }[] = [];
  const needsFileFallback: GitHubPR[] = [];

  // First pass: parse slugs from titles, collect PRs needing file fallback
  for (const pr of prs) {
    if (!pr.merged_at) continue;

    const slug = parseExtensionSlugFromPR(pr);
    if (slug) {
      // Skip if this extension is in the "new" list and the PR is not newer
      const feedDate = newItemDates.get(slug);
      if (feedDate && new Date(pr.merged_at).getTime() <= new Date(feedDate).getTime()) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      candidates.push({ pr, slug });
    } else {
      needsFileFallback.push(pr);
    }
  }

  // Batch fetch file-based slugs in parallel (avoids sequential API calls)
  if (needsFileFallback.length > 0) {
    const slugResults = await Promise.all(
      needsFileFallback.map(async (pr) => ({
        pr,
        slug: await fetchExtensionSlugFromPRFiles(pr.number),
      })),
    );

    for (const { pr, slug } of slugResults) {
      if (!slug) continue;
      // Skip if this extension is in the "new" list and the PR is not newer
      const feedDate = newItemDates.get(slug);
      if (feedDate && new Date(pr.merged_at!).getTime() <= new Date(feedDate).getTime()) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      candidates.push({ pr, slug });
    }
  }

  // Fetch package.json for all candidates in parallel
  const results = await Promise.all(
    candidates.map(async ({ pr, slug }) => {
      const pkgInfo = await fetchExtensionPackageInfo(slug);
      const owner = pkgInfo?.owner ?? pr.user.login;
      const title =
        pkgInfo?.title ??
        slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

      const description = pkgInfo?.description ?? pr.title;
      const iconUrl = pkgInfo?.icon ? getExtensionIconUrl(slug, pkgInfo.icon) : "";

      return {
        id: `pr-${pr.number}`,
        title,
        summary: description,
        image: iconUrl || pr.user.avatar_url,
        date: pr.merged_at!,
        authorName: pr.user.login,
        authorUrl: pr.user.html_url,
        url: `https://www.raycast.com/${owner}/${slug}`,
        type: "updated" as const,
        extensionSlug: slug,
        prUrl: pr.html_url,
        platforms: pkgInfo?.platforms ?? ["macOS"],
        version: pkgInfo?.version,
        categories: pkgInfo?.categories,
        extensionIcon: pkgInfo?.icon,
      };
    }),
  );

  return results;
}

/**
 * Gets the set of installed extension slugs by reading from the Raycast
 * application support directory.
 *
 * Extensions are stored in:
 *   ~/Library/Application Support/com.raycast.macos/extensions/
 * Each extension directory contains a package.json with `name` field.
 *
 * We use the Raycast environment.assetsPath to locate the support directory.
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
