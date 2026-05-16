import { LocalStorage } from "@raycast/api";

import { PostHogAPIError } from "../api/client";
import { getCurrentUser, listOrganizationProjects } from "../api/organizations";
import { listProjects } from "../api/projects";

export default async function () {
  // Try in order: org-scoped list (if we know the org), then global list, then fall back to
  // the user-scoped /users/@me/ endpoint which is always accessible for any valid personal key.
  const orgId = await LocalStorage.getItem<string>("active-org-id");
  if (orgId) {
    try {
      const { results } = await listOrganizationProjects(orgId);
      return { projects: results.map((p) => ({ id: p.id, name: p.name })) };
    } catch (e) {
      if (!(e instanceof PostHogAPIError) || e.status < 500) throw e;
    }
  }

  try {
    const { results } = await listProjects();
    return { projects: results.map((p) => ({ id: p.id, name: p.name })) };
  } catch (e) {
    if (!(e instanceof PostHogAPIError) || (e.status !== 403 && e.status < 500)) throw e;
  }

  // Last-resort fallback: the user-scoped endpoint. Works even if the key is project-scoped.
  const me = await getCurrentUser();
  const teamId = me.team?.id;
  if (teamId) {
    return {
      projects: [{ id: teamId, name: me.team?.name ?? `Project ${teamId}` }],
      note: "Showing only your default project. Your API key may be scoped to a single project; recreate it with `organization:read` to list all projects.",
    };
  }
  throw new Error(
    "Couldn't list projects. Recreate your personal API key with `organization:read` and `project:read` scopes.",
  );
}
