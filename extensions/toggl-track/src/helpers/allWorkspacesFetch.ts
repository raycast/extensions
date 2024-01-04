import { Workspace } from "../api";

export function allWorkspacesFetch<T>(workSpaceFunction: (workspaceId: number) => Promise<T[] | null>) {
  return async (workspaces: Workspace[]) => {
    const data = await Promise.all(
      workspaces.map(async (workspace) => {
        const workspaceData = await workSpaceFunction(workspace.id);
        return workspaceData || [];
      }),
    );
    return data.flat();
  };
}
