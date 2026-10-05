import { createEntity, discover, requireAgentConnection } from "../api/client";
import { parsePropertyJson } from "./property-json";

type Input = {
  /** A `profileKind: kind` slug returned by orient. Before this call, discover that exact profile and use only its returned fields. Do not use a `role` slug here. */
  profileSlug: string;
  /** Title of the entity */
  title: string;
  /** Main content or description */
  content?: string;
  /** Short summary distinct from long-form content. */
  description?: string;
  /** Profile-specific fields as a JSON object string. Call discover for this exact profile first; use only returned keys and enum values. */
  properties?: string;
  /** URL (for bookmarks, articles, websites) */
  url?: string;
  /** Status (for tasks/projects): todo, in-progress, done */
  status?: string;
  /** Priority (for tasks): low, medium, high, urgent */
  priority?: string;
  /** Due date ISO string (for tasks/events): YYYY-MM-DD */
  dueDate?: string;
  /** Why this write is appropriate; retained with governed agent actions when supported. */
  reasoning?: string;
  /** Existing project ID only when the user named or selected a project. Do not create a project through this field. */
  projectId?: string;
  /** Do not use for direct create. Creation-time facets need one composite capture graph plan. */
  facets?: string;
  /** Workspace ID only when the user named or selected a workspace, or the live schema requires one. Omit for pod-wide entities. */
  workspaceId?: string;
};

export default async function tool(input: Input) {
  await requireAgentConnection();
  // Read the base schema first. A workspace overlay cannot be sent on a
  // pod-scoped direct write because workspaceId also controls placement; using
  // the base profile keeps the local fields and server validation identical.
  const baseProfile = (await discover({ profileSlugs: [input.profileSlug] })).profiles.find(
    (candidate) => candidate.slug === input.profileSlug
  );
  const profile =
    baseProfile ??
    (input.workspaceId
      ? (await discover({ workspaceId: input.workspaceId, profileSlugs: [input.profileSlug] })).profiles.find(
          (candidate) => candidate.slug === input.profileSlug
        )
      : undefined);
  if (!profile) {
    throw new Error(
      `Profile "${input.profileSlug}" is not available in this schema. ` +
        "Call orient to find the kind, then discover it. If it is workspace-scoped, ask the user to choose a workspace and discover it there."
    );
  }
  if ((profile.profileKind ?? "kind") !== "kind") {
    throw new Error(`Profile "${input.profileSlug}" is a role facet. Use attach-role on an existing entity instead.`);
  }
  if (profile.scope === "workspace" && !input.workspaceId) {
    throw new Error(
      `Profile "${input.profileSlug}" is workspace-scoped. Ask the user to choose a workspace and pass its workspaceId.`
    );
  }
  if (input.facets?.trim()) {
    return {
      success: false,
      status: "requires_composite_plan" as const,
      nextTool: "capture" as const,
      message:
        "Creation-time facets are a composite write. Use capture instead — it submits one governed graph proposal in a single call; do not create the entity and patch facets afterwards.",
    };
  }
  const response = await createEntity({
    profileSlug: input.profileSlug,
    title: input.title,
    content: input.content,
    description: input.description,
    url: input.url,
    status: input.status,
    priority: input.priority as "low" | "medium" | "high" | "urgent" | undefined,
    dueDate: input.dueDate,
    ...(profile.scope === "workspace" ? { workspaceId: input.workspaceId } : {}),
    properties: parsePropertyJson(input.properties),
    reasoning: input.reasoning,
    projectId: input.projectId,
    source: "raycast",
  });

  if (response.status === "proposed" || response.writeReceipt?.state === "pending") {
    const summary = response.summary ?? `Create ${input.profileSlug} "${input.title}"`;
    const link = response.reviewUrl ?? response.reviewPath;
    return {
      success: true,
      status: "proposed" as const,
      proposalId: response.proposalId,
      summary,
      reasoning: response.reasoning,
      reviewUrl: response.reviewUrl,
      reviewPath: response.reviewPath,
      // Tell Raycast AI exactly what to tell the user: summary + link, verbatim.
      message: link
        ? `Queued **${summary}** for your review. Approve: ${link}`
        : `Queued **${summary}** for your review (proposalId: ${response.proposalId}).`,
    };
  }

  if (response.status === "denied") {
    return {
      success: false,
      status: "denied" as const,
      message: response.summary ?? response.message ?? `Synap did not accept ${input.profileSlug} "${input.title}".`,
    };
  }

  if (response.writeReceipt?.state === "partial") {
    const warnings = response.writeReceipt.warnings ?? [];
    return {
      success: false,
      status: "partial" as const,
      id: response.writeReceipt.entityId ?? response.id,
      proposalId: response.writeReceipt.proposalId ?? response.proposalId,
      reviewUrl: response.writeReceipt.reviewUrl ?? response.reviewUrl,
      warnings,
      message:
        warnings.length > 0
          ? `Synap applied part of ${input.profileSlug} "${input.title}": ${warnings.join(" ")}`
          : `Synap applied part of ${input.profileSlug} "${input.title}". Review the receipt before continuing.`,
    };
  }

  return {
    success: true,
    status: "created" as const,
    id: response.writeReceipt?.entityId ?? response.id,
    title: input.title,
    type: input.profileSlug,
    message: `Created ${input.profileSlug} "${input.title}" (id: ${response.writeReceipt?.entityId ?? response.id ?? "unknown"})`,
  };
}
