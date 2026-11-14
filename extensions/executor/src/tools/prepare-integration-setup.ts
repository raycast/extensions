import type { Tool } from "@raycast/api";
import { prepareIntegrationSetup, prepareIntegrationSetupConfirmation } from "../lib/catalog-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or a read result. */
  workspaceId: string;
  kind: "mcp" | "openapi" | "graphql";
  /** Exact catalog domain returned by search-integration-catalog. Omit for custom setup. */
  domain?: string;
  /** Exact optional catalog slug returned by search-integration-catalog. */
  slug?: string;
  /** Custom HTTPS or local HTTP endpoint. Omit to configure from scratch. Never include credentials. */
  endpoint?: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => prepareIntegrationSetupConfirmation(input));

/** Open native integration setup for a selected catalog item or custom endpoint in the exact workspace. Setup remains pending until verified with list-integrations. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => prepareIntegrationSetup(input));
}
