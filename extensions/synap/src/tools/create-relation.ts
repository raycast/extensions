import { createRelation, requireAgentConnection } from "../api/client";

type Input = {
  /** ID of the source entity (the "from" side of the relation) */
  sourceEntityId: string;
  /** ID of the target entity (the "to" side of the relation) */
  targetEntityId: string;
  /**
   * Relation type — use standard conventions:
   * related_to, parent_of, child_of, belongs_to, authored_by, depends_on, references, source
   */
  type: string;
  /** Workspace ID. Required — use the workspace both entities belong to. */
  workspaceId: string;
};

export default async function tool(input: Input) {
  await requireAgentConnection();
  const response = await createRelation({
    sourceEntityId: input.sourceEntityId,
    targetEntityId: input.targetEntityId,
    type: input.type,
    workspaceId: input.workspaceId,
  });

  if (response.status === "proposed") {
    const summary = response.summary ?? `Link entity ${input.sourceEntityId} → ${input.targetEntityId}`;
    const link = response.reviewUrl ?? response.reviewPath;
    return {
      success: true,
      status: "proposed" as const,
      summary,
      reviewUrl: response.reviewUrl,
      message: link
        ? `Queued **${summary}** for your review. Approve: ${link}`
        : `Queued **${summary}** for review (proposalId: ${response.proposalId}).`,
    };
  }

  return {
    success: true,
    status: "created" as const,
    id: response.id,
    message: `Linked ${input.sourceEntityId} —[${input.type}]→ ${input.targetEntityId}`,
  };
}
