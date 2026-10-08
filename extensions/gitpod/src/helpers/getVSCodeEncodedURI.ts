import { IWorkspace } from "../api/Gitpod/Models/IWorkspace";

export function getCodeEncodedURI(workspace: IWorkspace): string {
  const data = {
    instanceId: workspace.instanceId,
    workspaceId: workspace.getWorkspaceId(),
    gitpodHost: "https://gitpod.io",
  };

  const vsCodeURI =
    "vscode://gitpod.gitpod-desktop/workspace/" +
    workspace.getRepositoryName() +
    `?` +
    encodeURIComponent(JSON.stringify(data));

  return vsCodeURI;
}
