import { searchIntegrationCatalog } from "../lib/catalog-ai";

type Input = {
  /** Service name or keywords. Do not pass credentials or endpoint URLs. */
  query: string;
  /** Optional catalog type filter. */
  kind?: "mcp" | "openapi" | "graphql";
  /** Zero-based page, from 0 to 250. */
  page?: number;
};

/** Search the public integration catalog with a bounded page and optional type filter. */
export default function tool(input: Input) {
  return searchIntegrationCatalog(input);
}
