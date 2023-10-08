import fetch from "node-fetch";
import { WorkspaceConfig } from "../../types";

export type GetJobUpdatesResponse = {
  running?: boolean;
  completed?: boolean;
  new_logs?: string;
  mem_peak?: unknown;
};

export async function getJobUpdates(workspace: WorkspaceConfig, jobId: string): Promise<GetJobUpdatesResponse> {
  const url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/jobs_u/getupdate/${jobId}?running=false&log_offset=100000`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workspace.workspaceToken}`,
    },
  });

  let data;
  try {
    data = (await response.json()) as GetJobUpdatesResponse;
  } catch (error) {
    console.error(error);
    return {};
  }
  return data;
}
