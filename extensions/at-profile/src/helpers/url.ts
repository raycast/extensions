// Stands in for {profile} while a template is parsed as a URL. Lowercase, because URL parsing lowercases hostnames.
// Lengthened until it can't collide with text already in the template.
function sentinelFor(urlTemplate: string): string {
  let sentinel = "zzprofilezz";
  while (urlTemplate.toLowerCase().includes(sentinel)) sentinel += "z";
  return sentinel;
}

function parseTemplate(urlTemplate: string): { url: URL; sentinel: string } {
  const sentinel = sentinelFor(urlTemplate);
  return { url: new URL(urlTemplate.trim().replace(/{profile}/g, sentinel)), sentinel };
}

function stripHostPrefix(hostname: string): string {
  return hostname.toLowerCase().replace(/^(www|m|app)\./, "");
}

/**
 * Strip whitespace and any leading @ signs from a profile, as typed or as stored in History
 */
export function cleanProfile(profile: string): string {
  return profile.trim().replace(/^@+/, "").trim();
}

/**
 * Reject anything that is not an http(s) URL
 */
function sanitizeUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Disallowed protocol: ${parsed.protocol}`);
  }
  return parsed.toString();
}

/**
 * The one way to turn an app's URL template and a profile into a URL. A template that already contains the @
 * (`https://www.threads.net/@{profile}`) gets exactly one, however the profile was typed.
 */
export function buildProfileUrl(urlTemplate: string, profile: string): string {
  const clean = cleanProfile(profile);
  if (!clean) {
    throw new Error("Please enter a profile");
  }
  return sanitizeUrl(urlTemplate.trim().replace(/{profile}/g, encodeURIComponent(clean)));
}

/**
 * @returns an error message, or undefined when the template is usable
 */
export function validateUrlTemplate(urlTemplate: string): string | undefined {
  if (!urlTemplate.trim()) {
    return "URL template is required";
  }
  if (!urlTemplate.includes("{profile}")) {
    return "URL template must contain the {profile} placeholder";
  }
  let parsed: URL;
  try {
    parsed = parseTemplate(urlTemplate).url;
  } catch {
    return "URL template must be a valid URL (e.g., https://example.com/{profile})";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "URL template must start with http:// or https://";
  }
  return undefined;
}

/**
 * The site's origin, for fetching a favicon
 */
export function getTemplateOrigin(urlTemplate: string): string | undefined {
  try {
    const { url, sentinel } = parseTemplate(urlTemplate);
    const hostname = url.hostname
      .split(".")
      .filter((label) => !label.includes(sentinel))
      .join(".");
    return `${url.protocol}//${hostname}`;
  } catch {
    return undefined;
  }
}

/**
 * Reduce a template to a comparable form, so `http://www.example.com/{profile}/` and
 * `https://example.com/{profile}` count as the same service
 */
export function normalizeUrlTemplate(urlTemplate: string): string {
  try {
    const { url, sentinel } = parseTemplate(urlTemplate);
    const pathname = url.pathname.replace(/\/+/g, "/").replace(/\/$/, "");
    // url.host keeps a port, and the hash keeps client-side routes (`#/u/{profile}`) apart
    return `https://${stripHostPrefix(url.host)}${pathname}${url.search}${url.hash}`.split(sentinel).join("{profile}");
  } catch {
    return urlTemplate.trim().toLowerCase();
  }
}

/**
 * Generate an app ID from its URL template: the host without www/m/app, plus the first fixed path segment.
 * `https://www.reddit.com/user/{profile}` → `reddit-com-user`, `https://www.producthunt.com/@{profile}` →
 * `producthunt-com`. Only used when an app is created; editing the template later keeps the ID.
 */
export function generateAppValue(urlTemplate: string): string {
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  try {
    const { url, sentinel } = parseTemplate(urlTemplate);
    const host = stripHostPrefix(url.hostname)
      .split(".")
      .filter((label) => label && !label.includes(sentinel))
      .join("-");
    const firstSegment = url.pathname.split("/").find((segment) => segment && !segment.includes(sentinel));
    return slugify(firstSegment ? `${host}-${firstSegment}` : host);
  } catch {
    return slugify(urlTemplate).slice(0, 20).replace(/-+$/, "");
  }
}
