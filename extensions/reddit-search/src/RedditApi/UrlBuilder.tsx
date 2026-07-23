const redditUrl = "https://www.reddit.com";

const joinUrl = (part1: string, part2: string) => {
  const p1 = part1.endsWith("/") ? part1.substring(0, part1.length - 1) : part1;
  const p2 = part2.startsWith("/") ? part2.substring(1) : part2;
  return p1 + "/" + p2;
};

export const joinWithBaseUrl = (part: string) => joinUrl(redditUrl, part);

/**
 * Builds a Reddit search URL.
 *
 * Reddit blocked anonymous access to the `.json` endpoints in 2025 (they now
 * return HTTP 403 behind a bot wall), so data requests use the Atom feed
 * (`.rss`) instead — it is the one unauthenticated surface still serving real
 * results. Pass `feed: false` to build the human-facing `/search` URL for
 * "Show all results on Reddit…".
 */
export const createSearchUrl = (subreddit = "", feed = false, query = "", type = "", limit = 0, sort = "") => {
  let url = redditUrl;

  if (subreddit) {
    url = joinUrl(url, subreddit);
  }

  url = joinUrl(url, feed ? "search.rss" : "search");

  const params = new URLSearchParams();

  if (query) {
    params.append("q", query);
  }

  // `restrict_sr` keeps a subreddit-scoped search inside that subreddit; without
  // it Reddit widens the query to all of Reddit.
  if (subreddit) {
    params.append("restrict_sr", "true");
  }

  if (type) {
    params.append("type", type);
  }

  if (limit) {
    params.append("limit", limit.toString());
  }

  if (sort) {
    params.append("sort", sort);
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};

export default { joinWithBaseUrl, createSearchUrl };
