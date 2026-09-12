import fetch from "node-fetch";
import { WorkspaceConfig } from "../types";

export async function validateWorkspace(workspace: WorkspaceConfig): Promise<true | [keyof WorkspaceConfig, string]> {
  try {
    const response = await fetch(`${workspace.remoteURL}api/workspaces/exists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workspace.workspaceToken}`,
      },
      body: JSON.stringify({ id: workspace.workspaceId }),
    });
    if (response.status === 401) {
      return ["workspaceToken", "Invalid Token"];
    } else if (response.status !== 200) {
      return ["remoteURL", "Invalid URL"];
    } else {
      const textResponse = await response.text();
      console.log("textResponse", textResponse);
      if (textResponse === "true") {
        return true;
      } else {
        return ["workspaceId", "Invalid Workspace"];
      }
    }
  } catch (_) {
    return ["remoteURL", "Invalid URL"];
  }
}
