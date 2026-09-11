import type { Tool } from "@raycast/api";
import { renameArtifactConfirmation, renameExecutorArtifact } from "../lib/artifact-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or an artifact read. */
  workspaceId: string;
  /** Exact artifact ID returned by list-artifacts. */
  artifactId: string;
  /** Optional updatedAt value from the artifact read used to prepare this edit. The update is rejected if the artifact has changed. */
  expectedUpdatedAt?: number;
  /** New non-blank artifact title. Omit to keep it unchanged. */
  title?: string;
  /** New artifact description. Omit to keep it unchanged; an empty string clears it. */
  description?: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => renameArtifactConfirmation(input));

/** Edit one exact saved Executor artifact's title or description through the same API as the native artifact editor. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => renameExecutorArtifact(input));
}
