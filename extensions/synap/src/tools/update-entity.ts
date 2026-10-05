import { requireAgentConnection, updateEntity } from "../api/client";
import { parsePropertyJson } from "./property-json";

type Input = {
  /** Entity ID to update */
  id: string;
  /** New title (optional) */
  title?: string;
  /** Replace or add profile-specific fields as a JSON object string. Get valid keys and enum values from list-profiles first. */
  properties?: string;
  /** Replace the entity's main content or description. */
  content?: string;
  /** Replace the entity URL (for bookmarks, articles, and websites). */
  url?: string;
  /** New status for tasks/projects: todo, in-progress, done, cancelled */
  status?: string;
  /** Priority for tasks: low, medium, high, urgent */
  priority?: string;
  /** Due date ISO string for tasks/events */
  dueDate?: string;
};

export default async function tool(input: Input) {
  await requireAgentConnection();
  const result = await updateEntity(input.id, {
    title: input.title,
    properties: parsePropertyJson(input.properties),
    content: input.content,
    url: input.url,
    status: input.status,
    priority: input.priority as "low" | "medium" | "high" | "urgent" | undefined,
    dueDate: input.dueDate,
  });

  // Backend may return a governance envelope (proposed) or a full entity (approved).
  // `proposalId` discriminates HubGovernanceResult from HubEntity (HubEntity has no proposalId).
  const envelope = result as {
    status?: string;
    proposalId?: string;
    summary?: string;
    reasoning?: string;
    reviewUrl?: string;
    reviewPath?: string;
  };
  if (envelope.proposalId && envelope.status === "proposed") {
    const summary = envelope.summary ?? `Update entity ${input.id}`;
    const link = envelope.reviewUrl ?? envelope.reviewPath;
    return {
      success: true,
      status: "proposed" as const,
      proposalId: envelope.proposalId,
      summary,
      reasoning: envelope.reasoning,
      reviewUrl: envelope.reviewUrl,
      reviewPath: envelope.reviewPath,
      message: link
        ? `Queued **${summary}** for your review. Approve: ${link}`
        : `Queued **${summary}** for your review (proposalId: ${envelope.proposalId}).`,
    };
  }

  // Approved — full entity returned
  const entity = result as { id: string; title?: string; profileSlug?: string };
  return {
    success: true,
    status: "updated" as const,
    id: entity.id,
    title: entity.title,
    type: entity.profileSlug,
    message: `Updated ${entity.profileSlug ?? "entity"} "${entity.title ?? entity.id}"`,
  };
}
