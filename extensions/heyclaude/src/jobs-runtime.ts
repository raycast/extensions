import {
  JOBS_URL,
  jobsCacheKey,
  parseJobsFeed,
  resolveJobsUrl,
  type ParsedJobsFeed,
} from "./jobs-feed";
import type { FetchLike, RaycastTextCache } from "./runtime";

export function loadCachedJobs(
  cache: RaycastTextCache,
  jobsUrl = JOBS_URL,
): ParsedJobsFeed {
  const cacheKey = jobsCacheKey(jobsUrl);
  const cached = cache.get(cacheKey);
  if (!cached) return { entries: [], generatedAt: "", count: 0 };

  try {
    return parseJobsFeed(cached);
  } catch {
    cache.remove(cacheKey);
    return { entries: [], generatedAt: "", count: 0 };
  }
}

export async function fetchFreshJobs(options: {
  cache: RaycastTextCache;
  fetchFn?: FetchLike;
}) {
  const fetchFn = options.fetchFn ?? fetch;
  const jobsUrl = resolveJobsUrl();
  const response = await fetchFn(jobsUrl, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Jobs feed responded with ${response.status}`);
  }

  const text = await response.text();
  const nextFeed = parseJobsFeed(text);
  options.cache.set(jobsCacheKey(jobsUrl), text);
  return nextFeed;
}
