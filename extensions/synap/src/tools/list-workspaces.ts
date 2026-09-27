import { getWorkspaces } from "../api/client";

type Input = {
  // No inputs — returns all workspaces accessible to the current user.
};

export default async function tool(_input: Input) {
  const workspaces = await getWorkspaces();

  if (!workspaces.length) {
    return { found: false, message: "No workspaces found on this pod.", workspaces: [] };
  }

  return {
    found: true,
    count: workspaces.length,
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
    })),
    hint: "This is the full accessible inventory. orient.workspaceCount is the compact domain map and may be smaller. Workspaces are optional lenses — pass workspaceId only when the user named one, Set Synap Focus is on, or a live schema/action requires it.",
  };
}
