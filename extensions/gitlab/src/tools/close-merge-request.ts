import { gitlab } from "../common";
import { fetchMergeRequestGqlByProjectIdIid } from "../components/mr_gql";

type Input = {
  projectId: number;
  mergeRequestIid: number;
};

export async function confirmation({ projectId, mergeRequestIid }: Input) {
  const mergeRequest = await fetchMergeRequestGqlByProjectIdIid(projectId, mergeRequestIid);
  return {
    message: `Are you sure you want to close the merge request?`,
    info: [
      {
        name: "Merge Request",
        value: `${mergeRequest.reference_full || `!${mergeRequest.iid}`}: ${mergeRequest.title}`,
      },
      { name: "Project", value: `${mergeRequest.project_id}` },
    ],
  };
}

export default async function ({ projectId, mergeRequestIid }: Input) {
  await gitlab.put(`projects/${projectId}/merge_requests/${mergeRequestIid}`, { state_event: "close" });
  return { ok: true };
}
