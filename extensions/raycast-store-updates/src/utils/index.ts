import { GitHubPR, StoreItem } from "../types";

const RAW_CONTENT_BASE = "https://raw.githubusercontent.com/raycast/extensions/main/extensions";

/**
 * Parses the Raycast Store URL to extract author and extension name.
 * URL format: https://www.raycast.com/{author}/{extension}
 */
export function parseExtensionUrl(url: string): { author: string; extension: string } {
  const path = url.replace("https://www.raycast.com/", "");
  const [author, extension] = path.split("/");
  return { author, extension };
}

/**
 * Creates a Raycast deeplink to open an extension in the Store.
 * Format: raycast://extensions/{author}/{extension}
 */
export function createStoreDeeplink(url: string): string {
  const { author, extension } = parseExtensionUrl(url);
  return `raycast://extensions/${author}/${extension}`;
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
 * Returns { owner, title } or null if not found.
 */
export async function fetchExtensionPackageInfo(slug: string): Promise<{
  owner: string;
  title: string;
  name: string;
  description: string;
  platforms: string[];
  version: string;
  categories: string[];
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
    };
    const owner = pkg.owner ?? pkg.author ?? slug;
    const title = pkg.title ?? pkg.name ?? slug;
    const name = pkg.name ?? slug;
    const description = pkg.description ?? "";
    const platforms = pkg.platforms ?? ["macOS"];
    const version = pkg.version ?? "";
    const categories = pkg.categories ?? [];
    return { owner, title, name, description, platforms, version, categories };
  } catch {
    return null;
  }
}

/**
 * Converts merged GitHub PRs into StoreItems.
 * Filters for only merged PRs and deduplicates by extension slug.
 * Fetches package.json for each to get the correct store owner.
 */
export async function convertPRsToStoreItems(prs: GitHubPR[], existingNewIds: Set<string>): Promise<StoreItem[]> {
  const seen = new Set<string>();
  const candidates: { pr: GitHubPR; slug: string }[] = [];

  for (const pr of prs) {
    if (!pr.merged_at) continue;

    const slug = parseExtensionSlugFromPR(pr);
    if (!slug || seen.has(slug)) continue;

    // Skip if this extension is already in the "new" list
    if (existingNewIds.has(slug)) continue;

    seen.add(slug);
    candidates.push({ pr, slug });
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

      return {
        id: `pr-${pr.number}`,
        title,
        summary: description,
        image: pr.user.avatar_url,
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
      };
    }),
  );

  return results;
}
