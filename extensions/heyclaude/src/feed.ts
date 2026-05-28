import {
  isRecord,
  normalizeStringArray,
  optionalBoolean,
  optionalNumber,
  optionalRawString,
  optionalString,
  uniqueStrings,
} from "./utils";

export const FEED_URL = "https://heyclau.de/data/raycast-index.json";
export const SUBMIT_URL = "https://heyclau.de/submit";
export const GITHUB_NEW_ISSUE_URL =
  "https://github.com/JSONbored/claudepro-directory/issues/new";
export const CACHE_KEY = "heyclaude-raycast-index";
export const DETAIL_CACHE_PREFIX = "heyclaude-raycast-detail";
export const FAVORITES_KEY = "favorite-entry-keys";
const RAYCAST_FEED_PATH = "/data/raycast-index.json";

export type DownloadTrust = "first-party" | "external" | null;

export type RaycastEntry = {
  category: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  author?: string;
  brandName?: string;
  brandDomain?: string;
  brandIconUrl?: string;
  brandLogoUrl?: string;
  brandAssetSource?: string;
  brandVerifiedAt?: string;
  platformCompatibility?: string[];
  installCommand: string;
  configSnippet: string;
  copyText: string;
  copyTextLength?: number;
  copyTextTruncated?: boolean;
  detailMarkdown: string;
  detailUrl?: string;
  webUrl: string;
  canonicalUrl?: string;
  llmsUrl?: string;
  apiUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  repoUrl: string;
  documentationUrl: string;
  downloadTrust: DownloadTrust;
  verificationStatus: string;
};

function normalizeDownloadTrust(value: unknown): DownloadTrust {
  return value === "first-party" || value === "external" ? value : null;
}

function normalizePlatformCompatibility(value: unknown) {
  if (!Array.isArray(value)) return [];

  return uniqueStrings(
    value.flatMap((item) => {
      if (typeof item === "string") return item;
      if (!isRecord(item)) return [];

      const platform = optionalString(item.platform);
      const supportLevel = optionalString(item.supportLevel);
      if (!platform) return [];
      return supportLevel ? `${platform}: ${supportLevel}` : platform;
    }),
  );
}

export function buildEntrySummary(entry: RaycastEntry) {
  return [
    `${entry.title} — ${categoryLabel(entry.category)}`,
    entry.brandName ? `Brand: ${entry.brandName}` : "",
    entry.description,
    `URL: ${entry.webUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type RaycastDetail = {
  copyText: string;
  detailMarkdown: string;
};

export type ParsedFeed = {
  entries: RaycastEntry[];
  generatedAt: string;
};

export type CategoryOption = {
  value: string;
  title: string;
};

export type SubmissionDraft = {
  category?: string;
  title?: string;
  slug?: string;
  sourceUrl?: string;
  repoUrl?: string;
  documentationUrl?: string;
  brandName?: string;
  brandDomain?: string;
  description?: string;
  tags?: string[] | string;
};

export const categoryLabels: Record<string, string> = {
  agents: "Agents",
  mcp: "MCP Servers",
  tools: "Tools",
  skills: "Skills",
  rules: "Rules",
  commands: "Commands",
  hooks: "Hooks",
  guides: "Guides",
  collections: "Collections",
  statuslines: "Statuslines",
};

export const issueTemplateByCategory: Record<string, string> = {
  agents: "submit-agent.yml",
  mcp: "submit-mcp.yml",
  tools: "submit-entry.md",
  skills: "submit-skill.yml",
  rules: "submit-rule.yml",
  commands: "submit-command.yml",
  hooks: "submit-hook.yml",
  guides: "submit-guide.yml",
  collections: "submit-collection.yml",
  statuslines: "submit-statusline.yml",
};

export function entryKey(entry: Pick<RaycastEntry, "category" | "slug">) {
  return `${entry.category}:${entry.slug}`;
}

export function resolveFeedUrl(value?: string | null) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return FEED_URL;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Feed override must be a valid URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("Feed override must use HTTPS");
  }
  if (!url.pathname.endsWith(RAYCAST_FEED_PATH)) {
    throw new Error(`Feed override must end with ${RAYCAST_FEED_PATH}`);
  }

  url.hash = "";
  return url.toString();
}

export function scopedCacheKey(baseKey: string, feedUrl = FEED_URL) {
  const normalizedFeedUrl = resolveFeedUrl(feedUrl);
  if (normalizedFeedUrl === FEED_URL) return baseKey;
  return `${baseKey}:${encodeURIComponent(normalizedFeedUrl)}`;
}

export function feedCacheKey(feedUrl = FEED_URL) {
  return scopedCacheKey(CACHE_KEY, feedUrl);
}

export function detailCacheKey(
  entry: Pick<RaycastEntry, "category" | "slug">,
  feedUrl = FEED_URL,
) {
  return scopedCacheKey(`${DETAIL_CACHE_PREFIX}:${entryKey(entry)}`, feedUrl);
}

export function categoryLabel(category: string) {
  return categoryLabels[category] ?? category;
}

export function absoluteDataUrl(value: string, baseUrl = FEED_URL) {
  return new URL(value, baseUrl).toString();
}

function setOptionalParam(
  params: URLSearchParams,
  key: string,
  value?: string | string[],
) {
  const normalized = Array.isArray(value)
    ? value.map(String).filter(Boolean).join(", ")
    : String(value || "").trim();
  if (normalized) params.set(key, normalized);
}

export function buildContributeEntryUrl(
  entry?: Partial<RaycastEntry> | SubmissionDraft,
) {
  const url = new URL(SUBMIT_URL);
  if (entry?.category) url.searchParams.set("category", entry.category);
  if (entry?.title) url.searchParams.set("name", entry.title);
  if (entry?.slug) url.searchParams.set("slug", entry.slug);
  setOptionalParam(url.searchParams, "description", entry?.description);
  setOptionalParam(url.searchParams, "card_description", entry?.description);
  setOptionalParam(url.searchParams, "brand_name", entry?.brandName);
  setOptionalParam(url.searchParams, "brand_domain", entry?.brandDomain);
  setOptionalParam(url.searchParams, "tags", entry?.tags);
  const draft = entry as SubmissionDraft | undefined;
  const repoUrl = entry?.repoUrl || draft?.repoUrl || "";
  const docsUrl = entry?.documentationUrl || draft?.documentationUrl || "";
  const sourceUrl = draft?.sourceUrl || "";
  setOptionalParam(url.searchParams, "github_url", repoUrl);
  setOptionalParam(url.searchParams, "docs_url", docsUrl || sourceUrl);
  return url.toString();
}

export function buildSubmitIssueUrl(
  categoryOrDraft?: string | SubmissionDraft,
) {
  const draft: SubmissionDraft | undefined =
    typeof categoryOrDraft === "string"
      ? { category: categoryOrDraft }
      : categoryOrDraft;
  const category = draft?.category;
  const template = category
    ? (issueTemplateByCategory[category] ?? "submit-entry.md")
    : "submit-entry.md";
  const url = new URL(GITHUB_NEW_ISSUE_URL);
  url.searchParams.set("template", template);
  if (category) url.searchParams.set("category", category);
  setOptionalParam(url.searchParams, "title", draft?.title);
  setOptionalParam(url.searchParams, "name", draft?.title);
  setOptionalParam(url.searchParams, "slug", draft?.slug);
  setOptionalParam(url.searchParams, "description", draft?.description);
  setOptionalParam(url.searchParams, "card_description", draft?.description);
  setOptionalParam(url.searchParams, "brand_name", draft?.brandName);
  setOptionalParam(url.searchParams, "brand_domain", draft?.brandDomain);
  setOptionalParam(url.searchParams, "tags", draft?.tags);
  setOptionalParam(url.searchParams, "github_url", draft?.repoUrl);
  setOptionalParam(
    url.searchParams,
    "docs_url",
    draft?.documentationUrl || draft?.sourceUrl,
  );
  return url.toString();
}

export function buildSuggestChangeUrl(entry: RaycastEntry) {
  const template = issueTemplateByCategory[entry.category] ?? "submit-entry.md";
  const url = new URL(GITHUB_NEW_ISSUE_URL);
  url.searchParams.set("template", template);
  url.searchParams.set(
    "title",
    `Update ${categoryLabel(entry.category)}: ${entry.title}`,
  );
  url.searchParams.set("name", entry.title);
  url.searchParams.set("slug", entry.slug);
  url.searchParams.set("category", entry.category);
  url.searchParams.set("description", entry.description);
  url.searchParams.set("card_description", entry.description);
  if (entry.brandName) url.searchParams.set("brand_name", entry.brandName);
  if (entry.brandDomain) {
    url.searchParams.set("brand_domain", entry.brandDomain);
  }
  if (entry.tags?.length) url.searchParams.set("tags", entry.tags.join(", "));
  if (entry.repoUrl) url.searchParams.set("github_url", entry.repoUrl);
  if (entry.documentationUrl) {
    url.searchParams.set("docs_url", entry.documentationUrl);
  }
  return url.toString();
}

export function normalizeRaycastEntry(value: unknown): RaycastEntry | null {
  if (!isRecord(value)) return null;

  const category = optionalString(value.category);
  const slug = optionalString(value.slug);
  const title = optionalString(value.title);
  const description = optionalString(value.description);
  const copyText = optionalRawString(value.copyText);
  const detailMarkdown = optionalRawString(value.detailMarkdown);
  const webUrl = optionalString(value.webUrl);

  if (
    !category ||
    !slug ||
    !title ||
    !description ||
    !copyText.trim() ||
    !detailMarkdown.trim() ||
    !webUrl
  ) {
    return null;
  }

  return {
    category,
    slug,
    title,
    description,
    tags: normalizeStringArray(value.tags),
    author: optionalString(value.author) || undefined,
    brandName: optionalString(value.brandName) || undefined,
    brandDomain: optionalString(value.brandDomain) || undefined,
    brandIconUrl: optionalString(value.brandIconUrl) || undefined,
    brandLogoUrl: optionalString(value.brandLogoUrl) || undefined,
    brandAssetSource: optionalString(value.brandAssetSource) || undefined,
    brandVerifiedAt: optionalString(value.brandVerifiedAt) || undefined,
    platformCompatibility: normalizePlatformCompatibility(
      value.platformCompatibility,
    ),
    installCommand: optionalRawString(value.installCommand),
    configSnippet: optionalRawString(value.configSnippet),
    copyText,
    copyTextLength: optionalNumber(value.copyTextLength),
    copyTextTruncated: optionalBoolean(value.copyTextTruncated),
    detailMarkdown,
    detailUrl: optionalString(value.detailUrl) || undefined,
    webUrl,
    canonicalUrl: optionalString(value.canonicalUrl) || undefined,
    llmsUrl: optionalString(value.llmsUrl) || undefined,
    apiUrl: optionalString(value.apiUrl) || undefined,
    seoTitle: optionalString(value.seoTitle) || undefined,
    seoDescription: optionalString(value.seoDescription) || undefined,
    repoUrl: optionalString(value.repoUrl),
    documentationUrl: optionalString(value.documentationUrl),
    downloadTrust: normalizeDownloadTrust(value.downloadTrust),
    verificationStatus: optionalString(value.verificationStatus),
  };
}

export function isValidRaycastEntry(value: unknown) {
  return normalizeRaycastEntry(value) !== null;
}

export function parseFeed(value: string): ParsedFeed {
  const parsed = JSON.parse(value) as unknown;
  const envelope = parsed as {
    schemaVersion?: unknown;
    generatedAt?: unknown;
    entries?: unknown;
  };
  if (!Array.isArray(envelope.entries)) {
    return { entries: [], generatedAt: "" };
  }

  const entries = envelope.entries
    .map(normalizeRaycastEntry)
    .filter((entry): entry is RaycastEntry => entry !== null);

  return {
    entries,
    generatedAt:
      typeof envelope.generatedAt === "string" ? envelope.generatedAt : "",
  };
}

export function isRaycastDetail(value: unknown): value is RaycastDetail {
  const detail = value as Partial<RaycastDetail>;
  return (
    Boolean(detail) &&
    typeof detail.copyText === "string" &&
    typeof detail.detailMarkdown === "string"
  );
}

export function parseDetail(value: string): RaycastDetail | null {
  const parsed = JSON.parse(value) as unknown;
  return isRaycastDetail(parsed) ? parsed : null;
}

export function fallbackDetail(entry: RaycastEntry): RaycastDetail {
  return {
    copyText: entry.copyText,
    detailMarkdown: entry.detailMarkdown,
  };
}

export function sortedCategoryOptions(
  entries: RaycastEntry[],
): CategoryOption[] {
  const categories = [...new Set(entries.map((entry) => entry.category))].sort(
    (left, right) => categoryLabel(left).localeCompare(categoryLabel(right)),
  );

  return [
    { value: "all", title: "All Categories" },
    { value: "favorites", title: "Favorites" },
    ...categories.map((category) => ({
      value: category,
      title: categoryLabel(category),
    })),
  ];
}

export function filterEntriesByCategory(
  entries: RaycastEntry[],
  category: string,
  favorites: Set<string>,
) {
  if (category === "favorites") {
    return entries.filter((entry) => favorites.has(entryKey(entry)));
  }
  if (category === "all") return entries;
  return entries.filter((entry) => entry.category === category);
}

export function parseFavoriteKeys(raw: string | null | undefined) {
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.map(String))].sort();
}

export function serializeFavoriteKeys(favorites: Iterable<string>) {
  return JSON.stringify([...new Set(favorites)].sort());
}
