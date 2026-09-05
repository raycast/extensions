import gitUrlParse from "git-url-parse";
import { getHostRules } from "./config";
import type { Protocol, RemoteCheck, RemoteInfo } from "./types";

/**
 * Canonical folder-space form of a remote host: lowercased, with the configured
 * host alias applied (e.g. "git.uni-wuppertal.de" → "buw"). All identity
 * comparisons and root-relative paths use this space.
 */
function canonicalHost(host: string): string {
  const lower = host.toLowerCase();
  return getHostRules().realToAlias.get(lower) ?? lower;
}

export interface ParsedRemote {
  /** Hostname without port, e.g. "github.com". */
  host: string;
  port?: number;
  /** Repo path without leading slash or ".git", e.g. "owner/repo" (may contain subgroups). */
  path: string;
  /** "ssh", "https", "http", "git", "file", … */
  protocol: string;
}

/**
 * Parse any git remote URL (scp-like, ssh://, https://, git://). Returns undefined when unparseable.
 * Leading-dash inputs are rejected so values that pass this check can never be read as git flags.
 */
export function parseRemoteUrl(url: string): ParsedRemote | undefined {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("-")) return undefined;
  try {
    const parsed = gitUrlParse(trimmed);
    if (!parsed.resource || !parsed.full_name) return undefined;
    return {
      host: parsed.resource,
      port: typeof parsed.port === "number" && parsed.port > 0 ? parsed.port : undefined,
      path: parsed.full_name.replace(/^\/+|\/+$/g, ""),
      protocol: parsed.protocol,
    };
  } catch {
    return undefined;
  }
}

/**
 * Protocol-independent identity of a remote: canonical (alias-space) host + lowercased path without ".git".
 * Two remotes with equal normalized forms point to the same repository.
 */
export function normalizeRemoteUrl(url: string): string | undefined {
  const parsed = parseRemoteUrl(url);
  if (!parsed) return undefined;
  return `${canonicalHost(parsed.host)}/${parsed.path.toLowerCase()}`;
}

export function remotesMatch(a: string, b: string): boolean {
  const na = normalizeRemoteUrl(a);
  const nb = normalizeRemoteUrl(b);
  return na !== undefined && na === nb;
}

export function buildRemoteUrl(host: string, repoPath: string, protocol: Protocol): string {
  if (protocol === "ssh") return `git@${host}:${repoPath}.git`;
  return `https://${host}/${repoPath}.git`;
}

export function protocolOf(url: string): string | undefined {
  return parseRemoteUrl(url)?.protocol;
}

/** Rewrite a remote URL to the given protocol. Non-standard ports are dropped. */
export function convertProtocol(url: string, to: Protocol): string | undefined {
  const parsed = parseRemoteUrl(url);
  if (!parsed) return undefined;
  return buildRemoteUrl(parsed.host, parsed.path, to);
}

/** Browser URL of the repository (best effort, works for GitHub/GitLab/Bitbucket-style hosts). */
export function webUrlFor(url: string): string | undefined {
  const parsed = parseRemoteUrl(url);
  if (!parsed) return undefined;
  return `https://${parsed.host}/${parsed.path}`;
}

/** Relative install path (host/owner/repo, alias-space host) a remote URL maps to inside the repos root. */
export function relativePathForUrl(url: string): string | undefined {
  const parsed = parseRemoteUrl(url);
  if (!parsed) return undefined;
  return `${canonicalHost(parsed.host)}/${parsed.path}`;
}

/**
 * Real remote host implied by the first path segment under the root:
 * resolves a configured alias, otherwise accepts any dotted hostname.
 */
function hostForFolder(folderHost: string): string | undefined {
  const lower = folderHost.toLowerCase();
  const real = getHostRules().aliasToReal.get(lower);
  if (real) return real;
  return lower.includes(".") ? lower : undefined;
}

/**
 * Expected origin URL derived from a repo's location under the root.
 * Returns undefined when the path does not follow the host/owner/repo layout
 * (unknown host) or when the host is configured for host-only comparison.
 */
export function expectedOriginFor(relativePath: string, protocol: Protocol): string | undefined {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length < 2) return undefined;
  const host = hostForFolder(segments[0]);
  if (!host) return undefined;
  if (getHostRules().hostOnly.has(canonicalHost(host))) return undefined;
  return buildRemoteUrl(host, segments.slice(1).join("/"), protocol);
}

export function checkRemotes(relativePath: string, remotes: RemoteInfo[], protocol: Protocol): RemoteCheck {
  const origin = remotes.find((r) => r.name === "origin");
  const segments = relativePath.split("/").filter(Boolean);
  const realHost = segments.length >= 2 ? hostForFolder(segments[0]) : undefined;

  // Host-only hosts (e.g. Overleaf's opaque project IDs): only the origin's host must match the location.
  if (realHost && getHostRules().hostOnly.has(canonicalHost(realHost))) {
    if (remotes.length === 0) {
      return { state: "no-remotes", message: "No remotes configured." };
    }
    if (!origin) {
      const names = remotes.map((r) => r.name).join(", ");
      return { state: "no-origin", message: `No “origin” remote (has: ${names}).` };
    }
    const parsedOrigin = parseRemoteUrl(origin.fetchUrl);
    if (parsedOrigin && canonicalHost(parsedOrigin.host) === canonicalHost(realHost)) {
      return { state: "ok", actualUrl: origin.fetchUrl, message: "origin host matches the repo location (host-only)." };
    }
    return {
      state: "mismatch",
      actualUrl: origin.fetchUrl,
      message: `origin points to ${origin.fetchUrl}, but the location implies host ${realHost} (host-only).`,
    };
  }

  const expectedUrl = expectedOriginFor(relativePath, protocol);

  if (!expectedUrl) {
    return {
      state: "unstructured",
      actualUrl: origin?.fetchUrl,
      message: "Path does not follow the host/owner/repo layout, so the expected origin cannot be derived.",
    };
  }
  if (remotes.length === 0) {
    return { state: "no-remotes", expectedUrl, message: "No remotes configured." };
  }
  if (!origin) {
    const names = remotes.map((r) => r.name).join(", ");
    return { state: "no-origin", expectedUrl, message: `No “origin” remote (has: ${names}).` };
  }
  if (!remotesMatch(origin.fetchUrl, expectedUrl)) {
    return {
      state: "mismatch",
      expectedUrl,
      actualUrl: origin.fetchUrl,
      message: `origin points to ${origin.fetchUrl}, but the location implies ${expectedUrl}.`,
    };
  }
  return { state: "ok", expectedUrl, actualUrl: origin.fetchUrl, message: "origin matches the repo location." };
}

/**
 * Turn user input into a cloneable URL. Full URLs keep their protocol;
 * bare paths like "github.com/owner/repo" (or with a configured host alias,
 * "buw/group/repo") get the default protocol.
 */
export function coerceCloneUrl(input: string, defaultProtocol: Protocol): string | undefined {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;
  const hasScheme = /^(https?|ssh|git|file):\/\//.test(trimmed) || /^[\w.-]+@[\w.-]+:/.test(trimmed);
  if (hasScheme) {
    return parseRemoteUrl(trimmed) ? trimmed : undefined;
  }
  const bare = /^([\w.-]+)\/(.+)$/.exec(trimmed);
  if (!bare) return undefined;
  const host = hostForFolder(bare[1]);
  if (!host || !/\.[a-z]{2,}$/i.test(host)) return undefined;
  return buildRemoteUrl(host, bare[2].replace(/\.git$/, ""), defaultProtocol);
}
