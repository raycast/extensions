import { attachFacet, requireAgentConnection } from "../api/client";
import { parsePropertyJson } from "./property-json";

type Input = {
  /** The existing primary-kind entity that should receive the role. */
  entityId: string;
  /** A role profile returned by list-profiles, such as decision or knowledge. */
  roleSlug: string;
  /** Workspace lens for the role attachment. Omit when the role is pod-wide. */
  workspaceId?: string;
  /** Role-specific values as a JSON object string, when the live role schema requires them. */
  properties?: string;
  /** Why this role belongs on the entity; shown to a reviewer when governed. */
  reasoning?: string;
};

/** Attach a role; roles are facets, never independently created entities. */
export default async function tool(input: Input) {
  await requireAgentConnection();
  const result = await attachFacet({
    entityId: input.entityId,
    profileSlug: input.roleSlug,
    workspaceId: input.workspaceId,
    properties: parsePropertyJson(input.properties),
    reasoning: input.reasoning,
  });

  if (result.status === "proposed") {
    return {
      status: "proposed" as const,
      proposalId: result.proposalId,
      reviewUrl: result.reviewUrl,
      message: result.reviewUrl
        ? `Queued role "${input.roleSlug}" for review. Approve: ${result.reviewUrl}`
        : `Queued role "${input.roleSlug}" for review (proposalId: ${result.proposalId ?? "unknown"}).`,
    };
  }

  return {
    status: "attached" as const,
    roleSlug: input.roleSlug,
    facetId: result.facetId,
    message: result.message ?? `Attached role "${input.roleSlug}" to entity ${input.entityId}.`,
  };
}
