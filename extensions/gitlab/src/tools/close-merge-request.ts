import { gitlab } from "../common";

type Input = {
  projectId: number;
  mergeRequestIid: number;
};

export async function confirmation({ projectId, mergeRequestIid }: Input) {
  const mr = await gitlab.getMergeRequest(projectId, mergeRequestIid, {});
  return {
    message: `Are you sure you want to close the merge request?`,
    info: [
      { name: "Merge Request", value: `${mr.reference_full || `!${mr.iid}`}: ${mr.title}` },
      { name: "Project", value: `${mr.project_id}` },
    ],
  };
}

export default async function ({ projectId, mergeRequestIid }: Input) {
  await gitlab.put(`projects/${projectId}/merge_requests/${mergeRequestIid}`, { state_event: "close" });
  return { ok: true };
}
