import { Category, SITE_BASE_URL } from "../shared";

const SITEMAP_URL = `${SITE_BASE_URL}/sitemap.xml`;
const SITEMAP_SLUG_RE = /https:\/\/getdesign\.md\/([a-z0-9.-]+)\/design-md/g;
const SLUG_BLOCKLIST = new Set(["getdesign.md"]);

function titleCase(slug: string): string {
  return slug
    .split(/[-.]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// Sitemap-based fallback: returns slugs only, with derived names and "Other" category.
// Used when the bundle scrape fails (e.g. site changes break ENTRY_RE).
async function fetchSitemapDesigns(): Promise<ScrapedDesign[]> {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`Failed to load sitemap: ${res.status}`);
  const xml = await res.text();
  const seen = new Set<string>();
  const designs: ScrapedDesign[] = [];
  for (const match of xml.matchAll(SITEMAP_SLUG_RE)) {
    const slug = match[1];
    if (SLUG_BLOCKLIST.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    designs.push({ slug, name: titleCase(slug), description: "", category: "Other" });
  }
  return designs;
}

export type ScrapedDesign = {
  slug: string;
  name: string;
  description: string;
  category: Category;
};

const CATEGORY_DISPLAY: Record<string, Category> = {
  "ai-ml": "AI & LLM Platforms",
  "developer-tools": "Developer Tools & IDEs",
  "backend-devops": "Backend, Database & DevOps",
  "productivity-saas": "Productivity & SaaS",
  "design-creative": "Design & Creative Tools",
  fintech: "Fintech & Crypto",
  "ecommerce-retail": "E-commerce & Retail",
  "media-consumer": "Media & Consumer Tech",
  automotive: "Automotive",
};

// Captures: {slug:"<slug>/DESIGN",name:"<Name>",description:"<desc>",owner:"<slug>",category:"<cat>"
const ENTRY_RE =
  /\{slug:"([a-z0-9.-]+)\/DESIGN",name:"((?:[^"\\]|\\.)*)",description:"((?:[^"\\]|\\.)*)",owner:"[a-z0-9.-]+",category:"([a-z-]+)"/g;

// Match the main JS bundle URL on the homepage. The hash changes per deploy.
const BUNDLE_RE = /\/assets\/main-[A-Za-z0-9_-]+\.js/g;

function unescapeJsString(s: string): string {
  return s.replace(/\\(.)/g, "$1");
}

async function fetchMainBundleUrl(): Promise<string> {
  const res = await fetch(SITE_BASE_URL + "/");
  if (!res.ok) throw new Error(`Failed to load homepage: ${res.status}`);
  const html = await res.text();
  const matches = html.match(BUNDLE_RE);
  if (!matches || matches.length === 0) {
    throw new Error("Could not find main JS bundle on homepage");
  }
  return SITE_BASE_URL + matches[0];
}

async function scrapeBundle(): Promise<ScrapedDesign[]> {
  const bundleUrl = await fetchMainBundleUrl();
  const res = await fetch(bundleUrl);
  if (!res.ok) throw new Error(`Failed to load bundle: ${res.status}`);
  const js = await res.text();

  const seen = new Set<string>();
  const designs: ScrapedDesign[] = [];
  for (const match of js.matchAll(ENTRY_RE)) {
    const [, slug, rawName, rawDesc, rawCategory] = match;
    if (seen.has(slug)) continue;
    seen.add(slug);
    designs.push({
      slug,
      name: unescapeJsString(rawName),
      description: unescapeJsString(rawDesc),
      category: CATEGORY_DISPLAY[rawCategory] ?? "Other",
    });
  }
  return designs;
}

// Try the bundle first (full metadata). If parsing fails or yields no entries,
// fall back to the sitemap so the extension still lists every skill, just with
// degraded info (slug-derived name, no description, "Other" category).
export async function scrapeDesigns(): Promise<ScrapedDesign[]> {
  try {
    const designs = await scrapeBundle();
    if (designs.length > 0) return designs;
  } catch {
    // fall through to sitemap fallback
  }
  return fetchSitemapDesigns();
}
