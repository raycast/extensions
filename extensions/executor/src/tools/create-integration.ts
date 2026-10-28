import type { Tool } from "@raycast/api";
import { createAiIntegration, createIntegrationConfirmation } from "../lib/integration-setup-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID from list-workspaces. */
  workspaceId: string;
  kind: "mcp" | "openapi" | "graphql";
  /** Exact domain from search-integration-catalog. Omit for custom setup. */
  domain?: string;
  /** Exact catalog surface slug. Requires domain. */
  catalogSlug?: string;
  /** Custom endpoint URL, or raw JSON/YAML for OpenAPI. Omit when selecting a catalog item. Never include credentials or signed URLs. */
  endpoint?: string;
  /** Display name. Defaults to the catalog or endpoint name. */
  name?: string;
  /** Optional namespace. Defaults to the name-derived namespace. */
  namespace?: string;
  description?: string;
  /** Declarative authentication only, never credential values. Omit to use detected service/specification methods. OAuth discovery applies to MCP. */
  authentication?: "none" | "oauth2" | "apiKey";
  /** For API key authentication, where a later account's credential will be placed. */
  credentialLocation?: "header" | "query";
  /** Header or query parameter name, such as Authorization or X-API-Key. */
  credentialName?: string;
  /** Literal formatting prefix, such as 'Bearer '. Never provide a key or token. */
  credentialPrefix?: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => createIntegrationConfirmation(input));

/** Add a remote MCP, OpenAPI, or GraphQL integration using native Executor APIs. Validates configuration, creates once, and verifies the result. Account credentials are set up separately through add-connection. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => createAiIntegration(input));
}
