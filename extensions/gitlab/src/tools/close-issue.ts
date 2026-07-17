import { gitlab } from "../common";

type Input = {
  projectId: number;
  issueIid: number;
};

export async function confirmation({ projectId, issueIid }: Input) {
  const issue = await gitlab.getIssue(projectId, issueIid, {});
  return {
    message: `Are you sure you want to close the issue?`,
    info: [
      { name: "Issue", value: `${issue.reference_full || `#${issue.iid}`}: ${issue.title}` },
      { name: "Project", value: `${issue.project_id}` },
    ],
  };
}

export default async function ({ projectId, issueIid }: Input) {
  await gitlab.put(`projects/${projectId}/issues/${issueIid}`, { state_event: "close" });

  return { ok: true };
}
