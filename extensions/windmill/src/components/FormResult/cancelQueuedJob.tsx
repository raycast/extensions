import fetch from "node-fetch";
import { WorkspaceConfig } from "../../types";

export async function cancelQueuedJob(workspace: WorkspaceConfig, jobId: string): Promise<string> {
  const url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/jobs_u/queue/cancel/${jobId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workspace.workspaceToken}`,
    },
    body: JSON.stringify({
      reason: "Canceled by user from Raycast Extension",
    }),
  });

  let data;
  try {
    data = await response.text();
  } catch (error) {
    console.error(error);
    return "";
  }
  return data;
}
