import { getExecutorArtifact } from "../lib/ai-tools";
import { inAiWorkspace } from "../lib/workspace-ai";

type Input = {
  /** Stable ID or unique read-only alias returned by list-workspaces, such as personal or work. Required when multiple workspaces are configured. */
  workspaceId?: string;
  /** Exact artifact identifier returned by list-artifacts. */
  artifactId: string;
};

/** Get one saved Executor artifact, including its source and connection bindings. */
export default function tool(input: Input) {
  return inAiWorkspace(input, () => getExecutorArtifact(input));
}
