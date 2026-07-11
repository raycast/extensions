import { isSurfaceKind, searchIntegrations, type SurfaceKind } from "../api";

type Input = {
  /**
   * Search text, such as a domain, company name, product, API type, or integration surface.
   */
  query: string;
  /**
   * Optional surface kind to filter by. Use one of: mcp, openapi, graphql, cli.
   */
  kind?: string;
  /**
   * Maximum number of results to return. Defaults to 10 and is capped at 30.
   */
  limit?: number;
};

/**
 * Search integrations.sh for MCP, OpenAPI, GraphQL, and CLI integration surfaces.
 */
export default async function tool(input: Input) {
  const query = input.query.trim();

  if (!query) {
    throw new Error("Provide a search query, such as a domain or service name.");
  }

  const kind = normalizeKind(input.kind);
  const limit = clampLimit(input.limit);
  const response = await searchIntegrations({ query, kind, limit });

  return {
    query,
    kind: kind ?? "all",
    results: response.results.map((result) => ({
      domain: result.domain,
      name: result.name,
      description: result.description,
      kinds: result.kinds,
      url: result.url,
    })),
  };
}

function normalizeKind(kind: string | undefined): SurfaceKind | undefined {
  if (!kind) {
    return undefined;
  }

  const normalized = kind.trim().toLowerCase();
  if (!isSurfaceKind(normalized)) {
    throw new Error("kind must be one of: mcp, openapi, graphql, cli.");
  }

  return normalized;
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return 10;
  }

  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("limit must be a positive number.");
  }

  return Math.min(Math.floor(limit), 30);
}
