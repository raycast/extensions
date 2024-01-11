import { Workspace } from "../api";

export async function allWorkspacesFetch<T>(
  workSpaceFunction: (workspaceId: number) => Promise<T[] | null>,
  workspaces: Workspace[],
) {
  const data = await Promise.all(
    workspaces.map(async (workspace) => {
      const workspaceData = await workSpaceFunction(workspace.id);
      return workspaceData || [];
    }),
  );
  return data.flat();
}
