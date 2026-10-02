import type { Tool } from "@raycast/api";
import { deleteArtifactConfirmation, deleteExecutorArtifact } from "../lib/artifact-ai";
import { confirmInRequiredAiWorkspace, inRequiredAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Exact canonical workspace ID returned by list-workspaces or an artifact read. */
  workspaceId: string;
  /** Exact artifact ID returned by list-artifacts. */
  artifactId: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) =>
  confirmInRequiredAiWorkspace(input, () => deleteArtifactConfirmation(input));

/** Permanently delete one exact saved Executor artifact. The request is never retried automatically. */
export default function tool(input: Input) {
  return inRequiredAiWorkspace(input, () => deleteExecutorArtifact(input));
}
