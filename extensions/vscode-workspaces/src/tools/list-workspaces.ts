import * as os from "os";

import { findWorkspaceFiles, getWorkspaceName } from "../utils/utils";

interface Input {
  /**
   * The name of the workspace to search for.
   */
  workspaceName: string;
}

export default async function tool(input: Input) {
  const { workspaceName } = input;
  const normalizedInputName = workspaceName.toLowerCase().replace(/[-_ .]/g, " ");

  const workspaceFiles = await findWorkspaceFiles(os.homedir());

  const workspaces = workspaceFiles.filter((workspace) => {
    const normalizedWorkspaceName = getWorkspaceName(workspace)
      .toLowerCase()
      .replace(/[-_ .]/g, " ");

    return normalizedWorkspaceName.includes(normalizedInputName);
  });

  return workspaces;
}
