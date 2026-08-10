import { HTTP_METHODS, type HttpMethod } from "./client";

export interface ParsedRequest {
  method: HttpMethod;
  path: string;
  body?: string;
}

const SUPPORTED_METHODS = new Set<HttpMethod>(HTTP_METHODS);

/**
 * Parses OpenSearch Dashboards Dev Tools console syntax into a request, e.g.:
 *
 *   GET posts/_search
 *   {
 *     "query": { "match_all": {} }
 *   }
 *
 * The first non-empty, non-comment line is `METHOD path`; the remaining lines are
 * an optional JSON body. Lines starting with `#` are treated as comments.
 * Only a single request is parsed (the first one).
 */
export function parseConsole(input: string): ParsedRequest {
  const lines = input.split("\n");

  let index = 0;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (trimmed !== "" && !trimmed.startsWith("#") && !trimmed.startsWith("//")) break;
    index++;
  }
  if (index >= lines.length) {
    throw new Error("Enter a request, e.g. GET /_cluster/health");
  }

  const header = lines[index].trim();
  const match = header.match(/^([A-Za-z]+)\s+(\S.*)$/);
  if (!match) {
    throw new Error(`Invalid request line: "${header}". Expected "METHOD path".`);
  }

  const method = match[1].toUpperCase() as HttpMethod;
  if (!SUPPORTED_METHODS.has(method)) {
    throw new Error(`Unsupported method "${match[1]}".`);
  }

  let path = match[2].trim();
  if (!path.startsWith("/")) path = `/${path}`;

  const rawBody = lines
    .slice(index + 1)
    .join("\n")
    .trim();
  let body: string | undefined;
  if (rawBody && rawBody !== "{}") {
    try {
      JSON.parse(rawBody);
    } catch {
      throw new Error("Request body is not valid JSON.");
    }
    body = rawBody;
  }

  return { method, path, body };
}
