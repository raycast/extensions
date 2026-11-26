import { Cache } from "@raycast/api";
import {
  AuditSeverity,
  NpmPackageDetail,
  NpmSearchResult,
  PackagePerson,
  PackageVersionEntry,
  SecurityVulnerability,
} from "../types";
import { DEFAULT_REGISTRY_URL, NPM_DOWNLOADS_API } from "./constants";
import { deriveGitHubLinks, normalizeRepositoryUrl } from "./format";
import { compareSemver } from "./semver";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryFallbackCache = new Map<string, string>();
let raycastCache: Cache | null = null;

function getCache(): { get: (k: string) => string | undefined; set: (k: string, v: string) => void } {
  if (!raycastCache) {
    try {
      raycastCache = new Cache({ namespace: "packdeck-registry" });
    } catch {
      return {
        get: (k) => memoryFallbackCache.get(k),
        set: (k, v) => {
          memoryFallbackCache.set(k, v);
        },
      };
    }
  }
  return {
    get: (k) => raycastCache?.get(k),
    set: (k, v) => raycastCache?.set(k, v),
  };
}

function getCached<T>(key: string): T | undefined {
  try {
    const raw = getCache().get(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > parsed.expiresAt) return undefined;
    return parsed.data;
  } catch {
    return undefined;
  }
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs };
    getCache().set(key, JSON.stringify(entry));
  } catch {
    // ignore cache write issues
  }
}

export function normalizeRegistryUrl(registryUrl?: string): string {
  const base = (registryUrl || DEFAULT_REGISTRY_URL).trim().replace(/\/+$/, "");
  if (!base) return DEFAULT_REGISTRY_URL;
  try {
    const parsed = new URL(base);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return DEFAULT_REGISTRY_URL;
    }
    return base;
  } catch {
    return DEFAULT_REGISTRY_URL;
  }
}

export function encodePackageName(name: string): string {
  return name.startsWith("@") ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);
}

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 12_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "Packdeck-Raycast-Extension/1.0",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Registry request failed (${response.status} ${response.statusText})`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface RawSearchResponse {
  objects?: Array<{
    package: {
      name: string;
      scope?: string;
      version: string;
      description?: string;
      keywords?: string[];
      date?: string;
      links?: {
        npm?: string;
        homepage?: string;
        repository?: string;
        bugs?: string;
      };
      author?: PackagePerson;
      publisher?: PackagePerson;
      maintainers?: PackagePerson[];
    };
    score?: {
      final?: number;
      detail?: {
        quality?: number;
        popularity?: number;
        maintenance?: number;
      };
    };
  }>;
}

export async function fetchWeeklyDownloadsBatch(packageNames: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (packageNames.length === 0) return result;

  const unscoped = packageNames.filter((n) => !n.startsWith("@"));
  const scoped = packageNames.filter((n) => n.startsWith("@")).slice(0, 6);

  const tasks: Promise<void>[] = [];

  if (unscoped.length === 1) {
    tasks.push(
      fetchJson<{ downloads?: number }>(
        `${NPM_DOWNLOADS_API}/downloads/point/last-week/${encodeURIComponent(unscoped[0])}`,
        undefined,
        6000,
      )
        .then((data) => {
          if (typeof data.downloads === "number") result[unscoped[0]] = data.downloads;
        })
        .catch(() => undefined),
    );
  } else if (unscoped.length > 1) {
    const joined = unscoped.map((n) => encodeURIComponent(n)).join(",");
    tasks.push(
      fetchJson<Record<string, { downloads?: number } | null>>(
        `${NPM_DOWNLOADS_API}/downloads/point/last-week/${joined}`,
        undefined,
        6000,
      )
        .then((data) => {
          for (const [pkg, info] of Object.entries(data)) {
            if (info && typeof info.downloads === "number") {
              result[pkg] = info.downloads;
            }
          }
        })
        .catch(() => undefined),
    );
  }

  for (const pkg of scoped) {
    tasks.push(
      fetchJson<{ downloads?: number }>(
        `${NPM_DOWNLOADS_API}/downloads/point/last-week/${encodePackageName(pkg)}`,
        undefined,
        6000,
      )
        .then((data) => {
          if (typeof data.downloads === "number") result[pkg] = data.downloads;
        })
        .catch(() => undefined),
    );
  }

  await Promise.all(tasks);
  return result;
}

export async function searchNpmPackages(
  query: string,
  options: { registryUrl?: string; size?: number; includeDownloads?: boolean } = {},
): Promise<NpmSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const registry = normalizeRegistryUrl(options.registryUrl);
  const size = options.size ?? 25;
  const cacheKey = `search:${registry}:${trimmed.toLowerCase()}:${size}`;
  const cached = getCached<NpmSearchResult[]>(cacheKey);
  if (cached) return cached;

  const url = `${registry}/-/v1/search?text=${encodeURIComponent(trimmed)}&size=${size}`;
  const raw = await fetchJson<RawSearchResponse>(url);
  const objects = raw.objects ?? [];

  const results: NpmSearchResult[] = objects.map((obj) => ({
    name: obj.package.name,
    scope: obj.package.scope,
    version: obj.package.version,
    description: obj.package.description ?? "",
    keywords: obj.package.keywords ?? [],
    date: obj.package.date ?? "",
    links: {
      npm: obj.package.links?.npm ?? `https://www.npmjs.com/package/${obj.package.name}`,
      homepage: obj.package.links?.homepage,
      repository: normalizeRepositoryUrl(obj.package.links?.repository),
      bugs: obj.package.links?.bugs,
    },
    author: obj.package.author,
    publisher: obj.package.publisher,
    maintainers: obj.package.maintainers ?? [],
    score: {
      final: obj.score?.final ?? 0,
      detail: {
        quality: obj.score?.detail?.quality ?? 0,
        popularity: obj.score?.detail?.popularity ?? 0,
        maintenance: obj.score?.detail?.maintenance ?? 0,
      },
    },
  }));

  if (options.includeDownloads !== false && results.length > 0) {
    const downloads = await fetchWeeklyDownloadsBatch(results.map((r) => r.name));
    for (const item of results) {
      if (downloads[item.name] !== undefined) {
        item.weeklyDownloads = downloads[item.name];
      }
    }
  }

  setCached(cacheKey, results, 5 * 60 * 1000); // 5 min TTL
  return results;
}

interface RawPackumentVersion {
  version: string;
  description?: string;
  license?: string | { type?: string };
  homepage?: string;
  repository?: string | { url?: string };
  bugs?: string | { url?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  types?: string;
  typings?: string;
  deprecated?: string;
  dist?: {
    unpackedSize?: number;
    fileCount?: number;
  };
}

interface RawPackument {
  name: string;
  description?: string;
  "dist-tags"?: Record<string, string>;
  versions?: Record<string, RawPackumentVersion>;
  time?: Record<string, string>;
  readme?: string;
  license?: string | { type?: string };
  homepage?: string;
  repository?: string | { url?: string };
  bugs?: string | { url?: string };
  keywords?: string[];
  maintainers?: PackagePerson[];
  author?: string | PackagePerson;
}

function extractLicense(license: string | { type?: string } | undefined): string {
  if (!license) return "Unknown";
  if (typeof license === "string") return license;
  return license.type ?? "Unknown";
}

function extractAuthor(author: string | PackagePerson | undefined): string | undefined {
  if (!author) return undefined;
  if (typeof author === "string") return author;
  return author.name ?? author.username ?? author.email;
}

export async function fetchPackageDetail(packageName: string, registryUrl?: string): Promise<NpmPackageDetail> {
  const registry = normalizeRegistryUrl(registryUrl);
  const cacheKey = `detail:${registry}:${packageName}`;
  const cached = getCached<NpmPackageDetail>(cacheKey);
  if (cached) return cached;

  const encoded = encodePackageName(packageName);
  const [packument, weekly, monthly] = await Promise.all([
    fetchJson<RawPackument>(`${registry}/${encoded}`, undefined, 15_000),
    fetchJson<{ downloads?: number }>(
      `${NPM_DOWNLOADS_API}/downloads/point/last-week/${encoded}`,
      undefined,
      6000,
    ).catch(() => ({ downloads: undefined })),
    fetchJson<{ downloads?: number }>(
      `${NPM_DOWNLOADS_API}/downloads/point/last-month/${encoded}`,
      undefined,
      6000,
    ).catch(() => ({ downloads: undefined })),
  ]);

  const distTags = packument["dist-tags"] ?? {};
  const latestVersion = distTags.latest ?? Object.keys(packument.versions ?? {}).pop() ?? "0.0.0";
  const latestMeta = packument.versions?.[latestVersion];
  const timeMap = packument.time ?? {};

  // Reverse dist-tags map: version -> tag name
  const versionToTag = new Map<string, string>();
  for (const [tag, ver] of Object.entries(distTags)) {
    if (!versionToTag.has(ver) || tag === "latest") {
      versionToTag.set(ver, tag);
    }
  }

  const versions: PackageVersionEntry[] = Object.keys(packument.versions ?? {})
    .sort((a, b) => compareSemver(b, a))
    .slice(0, 60)
    .map((ver) => ({
      version: ver,
      publishedAt: timeMap[ver],
      distTag: versionToTag.get(ver),
      deprecated: packument.versions?.[ver]?.deprecated,
    }));

  const repoUrl = normalizeRepositoryUrl(latestMeta?.repository ?? packument.repository);
  const ghLinks = deriveGitHubLinks(repoUrl);
  const rawBugs = latestMeta?.bugs ?? packument.bugs;
  const bugsUrl = typeof rawBugs === "string" ? rawBugs : (rawBugs?.url ?? ghLinks.issuesUrl);

  const detail: NpmPackageDetail = {
    name: packument.name ?? packageName,
    description: latestMeta?.description ?? packument.description ?? "",
    latestVersion,
    distTags,
    versions,
    license: extractLicense(latestMeta?.license ?? packument.license),
    homepage: latestMeta?.homepage ?? packument.homepage,
    repositoryUrl: repoUrl,
    bugsUrl,
    npmUrl: `https://www.npmjs.com/package/${packageName}`,
    releasesUrl: ghLinks.releasesUrl,
    changelogUrl: ghLinks.changelogUrl,
    readme: packument.readme ?? "",
    keywords: packument.keywords ?? [],
    maintainers: packument.maintainers ?? [],
    author: extractAuthor(packument.author),
    dependencies: latestMeta?.dependencies ?? {},
    devDependencies: latestMeta?.devDependencies ?? {},
    peerDependencies: latestMeta?.peerDependencies ?? {},
    unpackedSize: latestMeta?.dist?.unpackedSize,
    fileCount: latestMeta?.dist?.fileCount,
    hasTypes: Boolean(latestMeta?.types || latestMeta?.typings || packageName.startsWith("@types/")),
    deprecated: latestMeta?.deprecated,
    lastPublished: timeMap[latestVersion] ?? timeMap.modified,
    weeklyDownloads: weekly.downloads,
    monthlyDownloads: monthly.downloads,
  };

  setCached(cacheKey, detail, 10 * 60 * 1000); // 10 min TTL
  return detail;
}

export interface AbbreviatedPackageMeta {
  name: string;
  latest: string;
  distTags: Record<string, string>;
  versions: string[];
}

export async function fetchAbbreviatedMeta(
  packageName: string,
  registryUrl?: string,
): Promise<AbbreviatedPackageMeta | null> {
  const registry = normalizeRegistryUrl(registryUrl);
  const cacheKey = `abbrev:${registry}:${packageName}`;
  const cached = getCached<AbbreviatedPackageMeta>(cacheKey);
  if (cached) return cached;

  try {
    const encoded = encodePackageName(packageName);
    const data = await fetchJson<{
      name?: string;
      "dist-tags"?: Record<string, string>;
      versions?: Record<string, unknown>;
    }>(
      `${registry}/${encoded}`,
      {
        headers: {
          Accept: "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8",
        },
      },
      8000,
    );

    const distTags = data["dist-tags"] ?? {};
    const versions = Object.keys(data.versions ?? {}).sort((a, b) => compareSemver(b, a));
    const latest = distTags.latest ?? versions[0] ?? "";
    if (!latest) return null;

    const result: AbbreviatedPackageMeta = {
      name: data.name ?? packageName,
      latest,
      distTags,
      versions,
    };
    setCached(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch {
    return null;
  }
}

interface BulkAdvisoryItem {
  id: number;
  url?: string;
  title: string;
  severity: string;
  vulnerable_versions: string;
  cwe?: string[];
  cvss?: { score?: number };
}

function normalizeSeverity(raw: string | undefined): AuditSeverity {
  const lower = (raw ?? "").toLowerCase();
  if (lower === "critical" || lower === "high" || lower === "moderate" || lower === "low" || lower === "info") {
    return lower;
  }
  return "moderate";
}

/**
 * Queries the official npm bulk advisory API for a map of { packageName: [installedVersions] }.
 * Enables real security vulnerability detection even for Bun or lockfile-less projects.
 */
export async function fetchBulkSecurityAdvisories(
  packages: Record<string, string[]>,
  registryUrl?: string,
): Promise<SecurityVulnerability[]> {
  if (Object.keys(packages).length === 0) return [];
  const registry = normalizeRegistryUrl(registryUrl);

  const response = await fetchJson<Record<string, BulkAdvisoryItem[]>>(
    `${registry}/-/npm/v1/security/advisories/bulk`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(packages),
    },
    15_000,
  );

  const vulns: SecurityVulnerability[] = [];
  for (const [pkgName, advisories] of Object.entries(response ?? {})) {
    if (!Array.isArray(advisories)) continue;
    for (const adv of advisories) {
      vulns.push({
        id: String(adv.id),
        packageName: pkgName,
        title: adv.title || `Vulnerability in ${pkgName}`,
        severity: normalizeSeverity(adv.severity),
        vulnerableRange: adv.vulnerable_versions || "*",
        url: adv.url,
        cves: adv.cwe ?? [],
        fixAvailable: true,
        via: [pkgName],
        isDirect: true,
      });
    }
  }
  return vulns;
}
