const API_BASE = "https://api.jsr.io";
const SITE_BASE = "https://jsr.io";

export const jsrUrls = {
  api: {
    /** Trimmed stats endpoint: `{newest, featured, updated}` stubs. */
    stats: () => `${API_BASE}/stats`,
    /** Full package metadata for a single package. */
    package: (scope: string, name: string) => `${API_BASE}/scopes/${scope}/packages/${name}`,
    /** Paginated list of published versions for a package. */
    versions: (scope: string, name: string) => `${API_BASE}/scopes/${scope}/packages/${name}/versions`,
    /** Documentation / quality score breakdown for a package. */
    score: (scope: string, name: string) => `${API_BASE}/scopes/${scope}/packages/${name}/score`,
    /** Packages that depend on the given package (incoming edges). */
    dependents: (scope: string, name: string, limit = 100) =>
      `${API_BASE}/scopes/${scope}/packages/${name}/dependents?limit=${limit}`,
    /** Packages that the given package version depends on (outgoing edges). */
    dependencies: (scope: string, name: string, version: string, limit = 100) =>
      `${API_BASE}/scopes/${scope}/packages/${name}/versions/${version}/dependencies?limit=${limit}`,
    /** All packages within a single scope. */
    scopePackages: (scope: string, limit = 100) => `${API_BASE}/scopes/${scope}/packages?limit=${limit}`,
    /** Per-day download counts (~last 90 days) plus recent-version breakdowns. */
    downloads: (scope: string, name: string) => `${API_BASE}/scopes/${scope}/packages/${name}/downloads`,
  },
  site: {
    /** jsr.io homepage — scraped for Orama Cloud credentials. */
    home: () => SITE_BASE,
    /** Public package page (uses `@scope/name` id form). */
    package: (id: string) => `${SITE_BASE}/${id}`,
    /** Public package documentation page. */
    packageDocs: (id: string) => `${SITE_BASE}/${id}/doc`,
    /** Public dependents listing page on jsr.io. */
    packageDependents: (scope: string, name: string) => `${SITE_BASE}/@${scope}/${name}/dependents`,
    /** Public dependencies listing page on jsr.io. */
    packageDependencies: (scope: string, name: string) => `${SITE_BASE}/@${scope}/${name}/dependencies`,
    /** Public package page built from explicit scope + name. */
    scopePackage: (scope: string, name: string) => `${SITE_BASE}/@${scope}/${name}`,
    /** Public package page pinned to a specific version. */
    scopePackageVersion: (scope: string, name: string, version: string) => `${SITE_BASE}/@${scope}/${name}@${version}`,
    /** Raw README served as a static asset (only for packages whose source is an actual README.md). */
    readme: (scope: string, name: string, version: string, readmePath = "/README.md") =>
      `${SITE_BASE}/@${scope}/${name}/${version}${readmePath}`,
    /** Per-version manifest (file sizes/checksums + exports map) served as a static CDN asset. */
    versionMeta: (scope: string, name: string, version: string) =>
      `${SITE_BASE}/@${scope}/${name}/${version}_meta.json`,
    /** npm package page on npmjs.com (for npm-kind dependencies). */
    npmPackage: (name: string) => `https://www.npmjs.com/package/${name}`,
    /** GitHub repository page for the linked source. */
    github: (owner: string, repo: string) => `https://github.com/${owner}/${repo}`,
    /** Search results page on jsr.io with pre-filled query. */
    searchQuery: (query: string) => `${SITE_BASE}/packages?search=${encodeURIComponent(query)}`,
  },
} as const;
