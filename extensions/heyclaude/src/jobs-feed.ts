import { FEED_URL } from "./feed";
import {
  isRecord,
  normalizeStringArray,
  optionalBoolean,
  optionalString,
} from "./utils";

export const JOBS_URL = "https://heyclau.de/api/jobs?limit=100";
export const JOBS_CACHE_KEY = "heyclaude-jobs-index";
export const FAVORITE_JOBS_KEY = "favorite-job-keys";

export type RaycastJob = {
  slug: string;
  title: string;
  company: string;
  companyUrl?: string;
  location: string;
  description: string;
  descriptionMd?: string;
  type?: string;
  postedAt?: string;
  compensation?: string;
  equity?: string;
  bonus?: string;
  benefits?: string[];
  responsibilities?: string[];
  requirements?: string[];
  featured: boolean;
  sponsored?: boolean;
  applyUrl: string;
  tier?: "free" | "standard" | "featured" | "sponsored";
  source?: "manual" | "polar" | "email" | "curated";
  sourceKind?: "official_ats" | "employer_careers" | "employer_submitted";
  sourceUrl?: string;
  firstSeenAt?: string;
  lastCheckedAt?: string;
  sourceCheckedAt?: string;
  curationNote?: string;
  claimedEmployer?: boolean;
  expiresAt?: string;
  isRemote?: boolean;
  isWorldwide?: boolean;
  webUrl: string;
  labels: string[];
  sourceLabel: string;
  applySourceLabel: string;
  lastVerifiedAt?: string;
};

export type ParsedJobsFeed = {
  entries: RaycastJob[];
  generatedAt: string;
  count: number;
};

export type JobFilterOption = {
  value: string;
  title: string;
};

function normalizeTier(value: unknown): RaycastJob["tier"] | undefined {
  return value === "free" ||
    value === "standard" ||
    value === "featured" ||
    value === "sponsored"
    ? value
    : undefined;
}

function normalizeSource(value: unknown): RaycastJob["source"] | undefined {
  return value === "manual" ||
    value === "polar" ||
    value === "email" ||
    value === "curated"
    ? value
    : undefined;
}

function normalizeSourceKind(
  value: unknown,
): RaycastJob["sourceKind"] | undefined {
  return value === "official_ats" ||
    value === "employer_careers" ||
    value === "employer_submitted"
    ? value
    : undefined;
}

export function resolveJobsUrl() {
  const url = new URL("/api/jobs", FEED_URL);
  url.searchParams.set("limit", "100");
  return url.toString();
}

export function jobsCacheKey(jobsUrl = JOBS_URL) {
  if (jobsUrl === JOBS_URL) return JOBS_CACHE_KEY;
  return `${JOBS_CACHE_KEY}:${encodeURIComponent(jobsUrl)}`;
}

export function jobKey(job: Pick<RaycastJob, "slug">) {
  return job.slug;
}

export function buildPostJobUrl(jobsUrl = JOBS_URL) {
  return new URL("/jobs/post", jobsUrl).toString();
}

export function normalizeRaycastJob(value: unknown): RaycastJob | null {
  if (!isRecord(value)) return null;

  const slug = optionalString(value.slug);
  const title = optionalString(value.title);
  const company = optionalString(value.company);
  const location = optionalString(value.location);
  const description = optionalString(value.description);
  const applyUrl = optionalString(value.applyUrl);
  const webUrl = optionalString(value.webUrl);
  const sourceLabel = optionalString(value.sourceLabel);
  const applySourceLabel = optionalString(value.applySourceLabel);

  if (
    !slug ||
    !title ||
    !company ||
    !location ||
    !description ||
    !applyUrl ||
    !webUrl ||
    !sourceLabel ||
    !applySourceLabel
  ) {
    return null;
  }

  return {
    slug,
    title,
    company,
    companyUrl: optionalString(value.companyUrl) || undefined,
    location,
    description,
    descriptionMd: optionalString(value.descriptionMd) || undefined,
    type: optionalString(value.type) || undefined,
    postedAt: optionalString(value.postedAt) || undefined,
    compensation: optionalString(value.compensation) || undefined,
    equity: optionalString(value.equity) || undefined,
    bonus: optionalString(value.bonus) || undefined,
    benefits: normalizeStringArray(value.benefits),
    responsibilities: normalizeStringArray(value.responsibilities),
    requirements: normalizeStringArray(value.requirements),
    featured: optionalBoolean(value.featured) ?? false,
    sponsored: optionalBoolean(value.sponsored),
    applyUrl,
    tier: normalizeTier(value.tier),
    source: normalizeSource(value.source),
    sourceKind: normalizeSourceKind(value.sourceKind),
    sourceUrl: optionalString(value.sourceUrl) || undefined,
    firstSeenAt: optionalString(value.firstSeenAt) || undefined,
    lastCheckedAt: optionalString(value.lastCheckedAt) || undefined,
    sourceCheckedAt: optionalString(value.sourceCheckedAt) || undefined,
    curationNote: optionalString(value.curationNote) || undefined,
    claimedEmployer: optionalBoolean(value.claimedEmployer),
    expiresAt: optionalString(value.expiresAt) || undefined,
    isRemote: optionalBoolean(value.isRemote),
    isWorldwide: optionalBoolean(value.isWorldwide),
    webUrl,
    labels: normalizeStringArray(value.labels),
    sourceLabel,
    applySourceLabel,
    lastVerifiedAt: optionalString(value.lastVerifiedAt) || undefined,
  };
}

export function isValidRaycastJob(value: unknown) {
  return normalizeRaycastJob(value) !== null;
}

export function parseJobsFeed(value: string): ParsedJobsFeed {
  const parsed = JSON.parse(value) as unknown;
  const envelope = parsed as {
    generatedAt?: unknown;
    count?: unknown;
    entries?: unknown;
  };
  if (!Array.isArray(envelope.entries)) {
    return { entries: [], generatedAt: "", count: 0 };
  }

  const entries = envelope.entries
    .map(normalizeRaycastJob)
    .filter((entry): entry is RaycastJob => entry !== null);
  return {
    entries,
    generatedAt:
      typeof envelope.generatedAt === "string" ? envelope.generatedAt : "",
    count: typeof envelope.count === "number" ? envelope.count : entries.length,
  };
}

export function sortedJobFilterOptions(): JobFilterOption[] {
  return [
    { value: "all", title: "All Jobs" },
    { value: "favorites", title: "Favorites" },
    { value: "featured", title: "Featured" },
    { value: "sponsored", title: "Sponsored" },
    { value: "remote", title: "Remote" },
    { value: "compensation", title: "Compensation Listed" },
    { value: "curated", title: "Editorially Curated" },
    { value: "claimed", title: "Claimed Employers" },
  ];
}

export function filterJobs(
  jobs: RaycastJob[],
  filter: string,
  favorites: Set<string>,
) {
  switch (filter) {
    case "favorites":
      return jobs.filter((job) => favorites.has(jobKey(job)));
    case "featured":
      return jobs.filter((job) => job.featured || job.sponsored);
    case "sponsored":
      return jobs.filter((job) => job.sponsored);
    case "remote":
      return jobs.filter((job) => job.isRemote);
    case "compensation":
      return jobs.filter((job) => Boolean(job.compensation));
    case "curated":
      return jobs.filter((job) => job.source === "curated");
    case "claimed":
      return jobs.filter((job) => job.claimedEmployer);
    default:
      return jobs;
  }
}

function bulletList(items?: string[]) {
  if (!items?.length) return "";
  return items.map((item) => `- ${item}`).join("\n");
}

function section(title: string, body?: string) {
  const trimmed = String(body || "").trim();
  return trimmed ? `\n## ${title}\n\n${trimmed}\n` : "";
}

export function buildJobMarkdown(job: RaycastJob) {
  return [
    `# ${job.company} — ${job.title}`,
    "",
    job.description,
    section("Responsibilities", bulletList(job.responsibilities)),
    section("Requirements", bulletList(job.requirements)),
    section("Benefits", bulletList(job.benefits)),
    section("Curation Note", job.curationNote),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildJobSummary(job: RaycastJob) {
  return [
    `${job.company} — ${job.title}`,
    job.location,
    job.type,
    job.compensation ? `Compensation: ${job.compensation}` : "",
    job.equity ? `Equity: ${job.equity}` : "",
    job.description,
    `Apply: ${job.applyUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseFavoriteJobKeys(raw: string | null | undefined) {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.map(String))].sort();
}

export function serializeFavoriteJobKeys(favorites: Iterable<string>) {
  return JSON.stringify([...new Set(favorites)].sort());
}
