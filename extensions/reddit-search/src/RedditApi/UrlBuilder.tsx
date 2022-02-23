const redditUrl = "https://www.reddit.com";

const joinUrl = (part1: string, part2: string) => {
  const p1 = part1.endsWith("/") ? part1.substring(0, part1.length - 1) : part1;
  const p2 = part2.startsWith("/") ? part2.substring(1) : part2;
  return p1 + "/" + p2;
};

export const joinWithBaseUrl = (part: string) => joinUrl(redditUrl, part);

export const createSearchUrl = (subreddit = "", json = false, query = "", type = "", limit = 0, sort = "") => {
  let url = redditUrl;

  if (subreddit) {
    url = joinUrl(url, subreddit);
  }

  url = joinUrl(url, json ? "search.json" : "search");

  if (subreddit || query || type || limit || sort) {
    const params = new URLSearchParams();

    if (subreddit) {
      params.append("restrict_sr", "true");
    }

    if (query) {
      params.append("q", query);
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

    url = url + "?" + params.toString();
  }

  return url;
};

export default { joinWithBaseUrl, createSearchUrl };
