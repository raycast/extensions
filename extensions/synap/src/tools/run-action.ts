import { requireAgentConnection, runAction } from "../api/client";
import { parseJsonObject } from "./property-json";

type Input = {
  /** A runnable verbId returned by list-actions. Supply this or skillId, never both. */
  verbId?: string;
  /** A runnable skillId returned by list-actions. Supply this or verbId, never both. */
  skillId?: string;
  /** Dynamic action parameters as a JSON object string. Use the selected action's catalog schema and brief. */
  parameters?: string;
  /** Workspace ID from the runnable action catalog. Execution must use the same explicit workspace lens. */
  workspaceId: string;
  /** Optional catalog connection ID when the action supports a specific linked account. */
  connectionId?: string;
  /** Optional Synap context object ID used to select a compatible connection. */
  contextObjectId?: string;
};

/**
 * Run a catalog action through Synap's shared capability gate. A proposed
 * result is a successful queued review; never retry it as an immediate write.
 */
export default async function tool(input: Input) {
  await requireAgentConnection();
  if ((input.verbId ? 1 : 0) + (input.skillId ? 1 : 0) !== 1) {
    throw new Error("Provide exactly one of verbId or skillId from list-actions.");
  }

  const connectionSelector =
    input.connectionId || input.contextObjectId
      ? { connectionId: input.connectionId, contextObjectId: input.contextObjectId }
      : undefined;
  const result = await runAction({
    verbId: input.verbId,
    skillId: input.skillId,
    parameters: parseJsonObject(input.parameters, "parameters"),
    workspaceId: input.workspaceId,
    connectionSelector,
  });

  if ("proposed" in result) {
    return {
      status: "proposed" as const,
      proposalId: result.proposalId,
      reviewUrl: result.reviewUrl,
      message: result.reviewUrl
        ? `Queued this action for review. Approve: ${result.reviewUrl}`
        : `Queued this action for review (proposalId: ${result.proposalId}).`,
    };
  }

  return result;
}
