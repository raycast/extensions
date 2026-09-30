/**
 * Normalizes whatever a user types for a subreddit into a bare slug.
 *
 * Accepts the forms people actually type — `glazeapp`, `r/glazeapp`, `/r/glazeapp`,
 * `www.reddit.com/r/glazeapp/`, a trailing slash, stray whitespace — and returns
 * just `glazeapp`. Reddit slugs are `[A-Za-z0-9_]`, so anything else is trimmed off
 * the end (e.g. a pasted URL with a query string).
 */
export function normalizeSubredditSlug(input: string): string {
  let slug = input.trim();

  // Strip a leading full URL or domain, keeping only what follows /r/.
  const match = slug.match(/(?:^|\/)r\/([^/?#\s]+)/i);
  if (match) {
    slug = match[1];
  }

  // Drop any leading r/ or /r/ that survived (bare "r/glazeapp" input).
  slug = slug.replace(/^\/?r\//i, "");

  // Keep only valid slug characters from the start.
  slug = slug.replace(/[^A-Za-z0-9_].*$/, "");

  return slug;
}

/** The canonical `/r/<slug>/` path fragment `createSearchUrl` expects. */
export function subredditPath(slug: string): string {
  return `/r/${slug}/`;
}
