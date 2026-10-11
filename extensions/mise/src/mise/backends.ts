import { isRecord, MiseExitError, MiseOutputError } from "./exec";
import type { RemoteVersion } from "./remote";

export const BACKENDS = [
  "aqua",
  "asdf",
  "cargo",
  "conda",
  "core",
  "dotnet",
  "forgejo",
  "gem",
  "github",
  "gitlab",
  "go",
  "npm",
  "packslip",
  "pipx",
  "pkgx",
  "spm",
  "http",
  "s3",
  "ubi",
  "vfox",
] as const;

export type Backend = (typeof BACKENDS)[number];
export type BackendQuery = { backend: Backend; query: string };

export type BackendResult = {
  backend: Backend;
  spec: string;
  name: string;
  description: string;
  version?: string;
  url?: string;
};

export type BackendSearchDeps = {
  fetch: typeof fetch;
  listRemote: (spec: string, options: { signal?: AbortSignal }) => Promise<RemoteVersion[]>;
  signal?: AbortSignal;
};

const QUERY = new RegExp(`^(${BACKENDS.join("|")}):(.*)$`);
const MISSING_PACKAGE = /package not found|404 Not Found|no aqua-registry found/;

export function parseBackendQuery(text: string): BackendQuery | undefined {
  const match = QUERY.exec(text.trim());
  if (!match) return undefined;
  const query = match[2].trim();
  if (!query) return undefined;
  return { backend: match[1] as Backend, query };
}

export async function searchBackend(
  backend: Backend,
  query: string,
  deps: BackendSearchDeps,
): Promise<BackendResult[]> {
  switch (backend) {
    case "npm":
      return searchNpm(query, deps);
    case "cargo":
      return searchCargo(query, deps);
    case "gem":
      return searchGem(query, deps);
    default:
      return validateSpec(backend, query, deps);
  }
}

async function searchNpm(query: string, deps: BackendSearchDeps): Promise<BackendResult[]> {
  const raw = await fetchJson(deps, `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=20`);
  if (!isRecord(raw) || !Array.isArray(raw.objects)) {
    throw new MiseOutputError("npm search: expected an objects array", JSON.stringify(raw));
  }
  return raw.objects.map((entry, index) => {
    const pkg = isRecord(entry) ? entry.package : undefined;
    if (!isRecord(pkg) || typeof pkg.name !== "string") {
      throw new MiseOutputError(`npm search: entry ${index} is not a package`, JSON.stringify(entry));
    }
    return result("npm", pkg.name, pkg.description, pkg.version, `https://www.npmjs.com/package/${pkg.name}`);
  });
}

async function searchCargo(query: string, deps: BackendSearchDeps): Promise<BackendResult[]> {
  const raw = await fetchJson(deps, `https://crates.io/api/v1/crates?q=${encodeURIComponent(query)}&per_page=20`, {
    "User-Agent": "raycast-mise",
  });
  if (!isRecord(raw) || !Array.isArray(raw.crates)) {
    throw new MiseOutputError("cargo search: expected a crates array", JSON.stringify(raw));
  }
  return raw.crates.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.name !== "string") {
      throw new MiseOutputError(`cargo search: entry ${index} is not a crate`, JSON.stringify(entry));
    }
    return result("cargo", entry.name, entry.description, entry.max_version, `https://crates.io/crates/${entry.name}`);
  });
}

async function searchGem(query: string, deps: BackendSearchDeps): Promise<BackendResult[]> {
  const raw = await fetchJson(deps, `https://rubygems.org/api/v1/search.json?query=${encodeURIComponent(query)}`);
  if (!Array.isArray(raw)) throw new MiseOutputError("gem search: expected an array", JSON.stringify(raw));
  return raw.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.name !== "string") {
      throw new MiseOutputError(`gem search: entry ${index} is not a gem`, JSON.stringify(entry));
    }
    return result("gem", entry.name, entry.info, entry.version, `https://rubygems.org/gems/${entry.name}`);
  });
}

async function validateSpec(backend: Backend, name: string, deps: BackendSearchDeps): Promise<BackendResult[]> {
  let versions: RemoteVersion[];
  try {
    versions = await deps.listRemote(`${backend}:${name}`, { signal: deps.signal });
  } catch (error) {
    if (error instanceof MiseExitError && MISSING_PACKAGE.test(error.stderr)) return [];
    throw error;
  }
  if (versions.length === 0) return [];
  return [result(backend, name, undefined, versions[versions.length - 1].version, packagePage(backend, name))];
}

function packagePage(backend: Backend, name: string): string | undefined {
  switch (backend) {
    case "github":
      return `https://github.com/${name}`;
    case "pipx":
      return `https://pypi.org/project/${name}`;
    default:
      return undefined;
  }
}

async function fetchJson(
  { fetch, signal }: BackendSearchDeps,
  url: string,
  headers?: Record<string, string>,
): Promise<unknown> {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) throw new Error(`${new URL(url).host} responded with HTTP ${response.status}`);
  return response.json();
}

function result(backend: Backend, name: string, description: unknown, version: unknown, url?: string): BackendResult {
  const entry: BackendResult = {
    backend,
    spec: `${backend}:${name}`,
    name,
    description: typeof description === "string" ? description.replace(/\s+/g, " ").trim() : "",
  };
  if (typeof version === "string") entry.version = version;
  if (url) entry.url = url;
  return entry;
}
