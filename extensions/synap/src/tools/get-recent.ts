import { getRecentEntities } from "../api/client";

type Input = {
  /** Filter by entity type. Leave empty for all types */
  entityType?: string;
  /** Number of recent items (default 10, max 30) */
  limit?: number;
  /** Scope to a specific workspace ID. Omit to fetch recent across the entire pod. */
  workspaceId?: string;
};

export default async function tool(input: Input) {
  const entities = await getRecentEntities({
    profileSlug: input.entityType,
    limit: Math.min(input.limit ?? 10, 30),
    workspaceId: input.workspaceId,
  });

  return {
    count: entities.length,
    entities: entities.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.profileSlug,
      status: e.status,
      updatedAt: e.updatedAt,
    })),
  };
}
