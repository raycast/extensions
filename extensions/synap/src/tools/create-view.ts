import { createView, requireAgentConnection, resolveProfileId } from "../api/client";
import { getConnection } from "../utils/preferences";
import { openUrl as portableOpen } from "../utils/deeplinks";
import { parseJsonObject } from "./property-json";

type Input = {
  /** View name. */
  name: string;
  /** table, kanban, list, gallery, calendar, bento, masonry, flow, or another Hub view type. */
  type: string;
  /** Workspace UUID. Required — do not invent one. */
  workspaceId: string;
  /** Optional kind slug or profile UUID. Slugs are resolved; Hub views require a profile UUID. */
  profileSlug?: string;
  /** Optional view config as a JSON object string. */
  config?: string;
};

/**
 * Create a saved view through Hub governance. Bounce with /open — Raycast
 * cannot draw or arrange widgets. Call list-views first to avoid duplicates.
 */
export default async function tool(input: Input) {
  await requireAgentConnection();

  const name = input.name?.trim();
  const type = input.type?.trim();
  const workspaceId = input.workspaceId?.trim();
  if (!name) {
    return { executed: false, needsClarification: true, message: "name is required." };
  }
  if (!type) {
    return {
      executed: false,
      needsClarification: true,
      message: "type is required (table, kanban, list, gallery, calendar, bento, …).",
    };
  }
  if (!workspaceId) {
    return {
      executed: false,
      needsClarification: true,
      message: "workspaceId is required. Get it from orient after the user selects a lens. Do not invent a workspace.",
    };
  }

  const profileSlug = input.profileSlug?.trim();
  let profileId: string | undefined;
  if (profileSlug) {
    const resolved = await resolveProfileId(workspaceId, profileSlug);
    if ("error" in resolved) {
      return { executed: false, needsClarification: true, message: resolved.error };
    }
    profileId = resolved.id;
  }

  const result = await createView({
    name,
    type,
    workspaceId,
    profileSlug: profileId,
    config: parseJsonObject(input.config, "config"),
  });

  const conn = await getConnection();
  const pod = conn?.podUrl.replace(/\/$/, "") ?? "";
  const bentoHint =
    type === "bento"
      ? " Created the bento shell. Place widgets in Synap Browser; list-widgets for keys. Raycast cannot render a dashboard."
      : "";

  if (result.status === "proposed") {
    const reviewUrl = result.reviewUrl;
    return {
      status: "proposed" as const,
      proposalId: result.proposalId,
      reviewUrl,
      openUrl: reviewUrl,
      message: reviewUrl
        ? `Queued view **${name}** for review. Open: ${reviewUrl}${bentoHint}`
        : `Queued view **${name}** for review (proposalId: ${result.proposalId ?? "unknown"}).${bentoHint}`,
    };
  }

  if (result.status === "denied") {
    return {
      status: "denied" as const,
      reason: result.reason,
      message: result.reason ?? "View create was denied. Do not retry the same write.",
    };
  }

  const id = result.id;
  const openUrl = pod && id ? portableOpen(pod, id) : undefined;
  return {
    status: "created" as const,
    id,
    openUrl,
    message: openUrl
      ? `Created view **${name}**. Open: ${openUrl}${bentoHint}`
      : `Created view **${name}**${id ? ` (id: ${id})` : ""}.${bentoHint}`,
  };
}
