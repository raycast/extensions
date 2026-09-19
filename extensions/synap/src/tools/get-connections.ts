import { getConnections } from "../api/client";

type Input = {
  /** Entity ID whose immediate neighbourhood you want to inspect. */
  entityId: string;
  /** Workspace lens for workspace-scoped links. Omit for pod-wide context. */
  workspaceId?: string;
  /** Maximum returned connections (default 50, maximum 200). */
  limit?: number;
};

/**
 * The graph-read companion to get-entity. Use after finding an entity when the
 * question is "what does this affect?", "what supports it?", or "what is it
 * connected to?". This is intentionally broader than raw relations: it also
 * includes structural property edges plus related channels and focus sessions.
 */
export default async function tool(input: Input) {
  const result = await getConnections(input.entityId, {
    workspaceId: input.workspaceId,
    limit: input.limit ?? 50,
  });

  return {
    entityId: input.entityId,
    counts: result.counts,
    connections: result.connections.map((connection) => ({
      source: connection.source,
      direction: connection.direction,
      label: connection.label,
      relationType: connection.relationType,
      propertyLabel: connection.propertyLabel,
      entity: connection.entity
        ? {
            id: connection.entity.id,
            title: connection.entity.title,
            profileSlug: connection.entity.profileSlug,
          }
        : undefined,
      channel: connection.channelId
        ? {
            id: connection.channelId,
            title: connection.channelTitle,
            relationshipType: connection.channelRelationshipType,
          }
        : undefined,
      focusSession: connection.focusSessionId
        ? {
            id: connection.focusSessionId,
            goal: connection.focusSessionGoal,
            status: connection.focusSessionStatus,
          }
        : undefined,
    })),
    hint: "Use the returned entity IDs with get-entity for full detail. Use create-relation only after checking this neighbourhood to avoid duplicate links.",
  };
}
