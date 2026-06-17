// https://github.com/feedbin/feedbin-api#pagination
// Links: <https://api.feedbin.com/v2/feeds/1/entries.json?page=2>; rel="next", <https://api.feedbin.com/v2/feeds/1/entries.json?page=5>; rel="last"
export function parseLinksHeader(links: string | null): {
  next?: string;
  last?: string;
} {
  if (links === null) return {};
  return links.split(",").reduce((acc, link) => {
    const [url, rel] = link.split(";").map((str) => str.trim());
    const [, key] = rel.split("=").map((str) => str.replace(/"/g, ""));
    if (key === "next" || key === "last") {
      return {
        ...acc,
        [key]: url.slice(1, -1),
      };
    } else {
      return acc;
    }
  }, {});
}
