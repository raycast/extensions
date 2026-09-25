import { Cache } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ChangelogCommit, parseChangelog } from "../utils/changelog";

const cache = new Cache({ namespace: "store-updates-changelog-commits" });
const FEED_TTL_MS = 15 * 60 * 1000;
const RAW = "https://raw.githubusercontent.com/raycast/extensions";

/**
 * The newest 20 commits that touched the extension's CHANGELOG.md, from GitHub's Atom feed.
 *
 * The feed is served by github.com, not api.github.com, so it does not spend the rate-limit
 * budget the update scan depends on. Cached for 15 minutes per extension.
 */
async function commitShas(slug: string): Promise<string[]> {
  const cached = cache.get(`feed:${slug}`);
  if (cached) {
    const { ts, shas } = JSON.parse(cached) as { ts: number; shas: string[] };
    if (Date.now() - ts < FEED_TTL_MS) return shas;
  }
  const response = await fetch(
    `https://github.com/raycast/extensions/commits/main/extensions/${slug}/CHANGELOG.md.atom`,
  );
  if (!response.ok) return [];
  const shas = [...(await response.text()).matchAll(/Grit::Commit\/([0-9a-f]{40})</g)].map((m) => m[1]);
  cache.set(`feed:${slug}`, JSON.stringify({ ts: Date.now(), shas }));
  return shas;
}

/**
 * The version titles in the extension's CHANGELOG.md at a commit (`ref` may be `<sha>~1`).
 * An empty list when the file did not exist there; null when it could not be read. A
 * commit never changes, so a successful read is cached with no expiry (Raycast's Cache
 * still evicts the least recently used entries past 10 MB).
 */
async function titlesAt(slug: string, ref: string): Promise<string[] | null> {
  try {
    const key = `titles:${ref}:${slug}`;
    const cached = cache.get(key);
    if (cached) return JSON.parse(cached) as string[];
    const response = await fetch(`${RAW}/${ref}/extensions/${slug}/CHANGELOG.md`);
    if (response.status === 404) return [];
    if (!response.ok) return null;
    const titles = parseChangelog(await response.text()).map((v) => v.title);
    cache.set(key, JSON.stringify(titles));
    return titles;
  } catch {
    return null;
  }
}

/**
 * The CHANGELOG.md history `attributeVersions()` needs: each recent commit with the titles
 * the file held there, plus the titles just before the oldest one. No billed requests.
 * A failed feed read means no commit actions. A failed read of one commit also hides what
 * the next-newer commit added, so pairing stops before both. The changelog itself is unaffected.
 */
export function useChangelogCommits(slug: string | undefined) {
  return usePromise(
    async (extension: string): Promise<{ history: ChangelogCommit[]; before: string[] | null }> => {
      try {
        const shas = await commitShas(extension);
        if (shas.length === 0) return { history: [], before: null };
        const [before, ...titles] = await Promise.all([
          titlesAt(extension, `${shas[shas.length - 1]}~1`),
          ...shas.map((sha) => titlesAt(extension, sha)),
        ]);
        return { history: shas.map((sha, i) => ({ sha, titles: titles[i] })), before };
      } catch {
        return { history: [], before: null };
      }
    },
    [slug!],
    { execute: !!slug },
  );
}
