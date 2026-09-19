import { listViews, resolveProfileId } from "../api/client";
import { getConnection } from "../utils/preferences";
import { openUrl } from "../utils/deeplinks";

type Input = {
  /** Workspace ID. HubRestClient lists views per workspace, not owner-wide. */
  workspaceId: string;
  /** Optional profile slug to narrow to one kind. */
  profileSlug?: string;
};

/**
 * List saved views in one workspace. Call this before create-view so you do
 * not duplicate an existing board. Raycast cannot render the view.
 */
export default async function tool(input: Input) {
  const workspaceId = input.workspaceId?.trim();
  if (!workspaceId) {
    return {
      found: false,
      views: [],
      message: "workspaceId is required. Get it from orient after the user selects a lens. Do not invent a workspace.",
    };
  }

  const profileSlug = input.profileSlug?.trim();
  let profileId: string | undefined;
  if (profileSlug) {
    const resolved = await resolveProfileId(workspaceId, profileSlug);
    if ("error" in resolved) {
      return { found: false, views: [], message: resolved.error };
    }
    profileId = resolved.id;
  }

  const views = await listViews(workspaceId, profileId ? { profileSlug: profileId } : undefined);

  const conn = await getConnection();
  const pod = conn?.podUrl.replace(/\/$/, "") ?? "";

  return {
    count: views.length,
    views: views.map((view) => ({
      id: view.id,
      name: view.name,
      type: view.type,
      profileSlug: view.profileSlug,
      profileId: view.profileId,
      workspaceId: view.workspaceId,
      openUrl: pod && view.id ? openUrl(pod, view.id) : undefined,
    })),
    hint:
      views.length === 0
        ? "No saved views in this workspace yet. Safe to create-view. Requires workspaceId (this client is not owner-wide)."
        : "Call list-views BEFORE create-view to avoid duplicates. Open a view at its openUrl.",
  };
}
