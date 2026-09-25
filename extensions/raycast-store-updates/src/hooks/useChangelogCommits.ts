import { Cache, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { asArray, githubHeaders } from "../utils";
import { ChangelogCommit } from "../utils/changelog";
import { RATE_LIMIT_RESET_KEY, useGitHubRateLimit } from "./useGitHubRateLimit";

const cache = new Cache({ namespace: "store-updates-changelog-commits" });
const TTL_MS = 15 * 60 * 1000;

/**
 * The commits that touched an extension's CHANGELOG.md, newest first.
 *
 * One billed `api.github.com` call per extension per 15 minutes: the fetch re-runs on
 * every mount, so paging back and forth through changelogs would otherwise
 * bill each visit against the tokenless 60/hr that the list and menu bar share. It makes
 * no call during the shared rate-limit cooldown, and starts one when GitHub reports the
 * quota exhausted. Every failure returns an empty list: the commit actions disappear, the
 * changelog does not.
 */
export function useChangelogCommits(slug: string | undefined) {
  const { recordRateLimit } = useGitHubRateLimit();
  // usePromise, not useCachedPromise: this hook keeps its own success-only cache, and
  // useCachedPromise would also persist the empty result of a cooldown or a failure.
  return usePromise(
    async (extension: string): Promise<ChangelogCommit[]> => {
      try {
        const cached = cache.get(extension);
        if (cached) {
          const { ts, commits } = JSON.parse(cached) as { ts: number; commits: ChangelogCommit[] };
          if (Date.now() - ts < TTL_MS) return commits;
        }
        const reset = Number(await LocalStorage.getItem<string>(RATE_LIMIT_RESET_KEY));
        if (reset > Date.now()) return [];
        const response = await fetch(
          `https://api.github.com/repos/raycast/extensions/commits?path=extensions/${extension}/CHANGELOG.md&per_page=100`,
          { headers: githubHeaders() },
        );
        // Same rule as fetchMergedPRs: only a 429, or a 403 with no quota left, is a rate limit.
        if (
          response.status === 429 ||
          (response.status === 403 && response.headers.get("X-RateLimit-Remaining") === "0")
        ) {
          await recordRateLimit(Number(response.headers.get("X-RateLimit-Reset")) || undefined);
          return [];
        }
        if (!response.ok) return [];
        // A success can spend the last request; start the cooldown now rather than on the next call's 403.
        if (response.headers.get("X-RateLimit-Remaining") === "0") {
          await recordRateLimit(Number(response.headers.get("X-RateLimit-Reset")) || undefined);
        }
        const commits = asArray<{ sha: string; commit: { committer: { date: string } } }>(await response.json()).map(
          (c) => ({ sha: c.sha, date: c.commit.committer.date }),
        );
        cache.set(extension, JSON.stringify({ ts: Date.now(), commits }));
        return commits;
      } catch {
        return [];
      }
    },
    [slug!],
    { execute: !!slug },
  );
}
