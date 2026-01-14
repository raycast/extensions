import { ParseResult } from "../types";

export interface TemplateContext {
  url: string;
  protocol: string;
  host: string;
  hostname: string;
  port?: string;
  path: string;
  pathSegments: string[];
  query: string;
  hash: string;
}

export function buildTemplateContext(parsed: ParseResult): TemplateContext {
  const pathSegments = extractPathSegments(parsed.path || "");

  const queryEntries = parsed.query ? Object.entries(parsed.query).filter(([k, v]) => k && v) : [];
  const queryString =
    queryEntries.length > 0
      ? "?" + queryEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v || "")}`).join("&")
      : "";

  return {
    url: parsed.href || "",
    protocol: parsed.protocol || "",
    host: parsed.hostname || "",
    hostname: parsed.hostname || "",
    port: parsed.port,
    path: parsed.path || "/",
    pathSegments,
    query: queryString,
    hash: parsed.hash ? `#${parsed.hash}` : "",
  };
}

function extractPathSegments(path: string): string[] {
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => decodeURIComponent(segment));
}

export function getPathByLevel(segments: string[], level: number): string {
  if (level === 0 || segments.length === 0) {
    return "/";
  }

  // Handle negative indices (count from end, Python-style)
  // -1 = full path, -2 = remove last 1, -3 = remove last 2, etc.
  if (level < 0) {
    const actualLevel = segments.length + level + 1;
    if (actualLevel <= 0) return "/";
    return "/" + segments.slice(0, actualLevel).join("/");
  }

  // Positive indices: take first N segments
  if (level > segments.length) {
    return "/" + segments.join("/"); // Return full path if level exceeds segments
  }

  return "/" + segments.slice(0, level).join("/");
}
