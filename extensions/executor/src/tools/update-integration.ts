import type { Tool } from "@raycast/api";
import { integrationMetadataConfirmation, saveIntegrationMetadata } from "../lib/integration-metadata";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or a read result. Aliases are not accepted for updates. */
  workspaceId: string;
  /** Exact integration slug returned by list-integrations, not its display name or a connection address. */
  integration: string;
  /** New display name. Omit to keep it unchanged. Must not be blank. */
  name?: string;
  /** New description. Omit to keep it unchanged; an empty string clears it. */
  description?: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => integrationMetadataConfirmation(input));

/** Edit an integration's name or description through the same management API as the native editor. Does not change its slug, credentials, schema, connections, or policies. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => saveIntegrationMetadata(input));
}
