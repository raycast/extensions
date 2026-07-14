import { listDeployments } from "../api/deployments";

type Input = {
  /** The ID of the environment whose deployments to list */
  environmentId: string;
};

export default async function (input: Input) {
  const response = await listDeployments(input.environmentId);
  return response.data.map((dep) => ({
    id: dep.id,
    status: dep.attributes.status,
    branch_name: dep.attributes.branch_name,
    commit_hash: dep.attributes.commit_hash,
    commit_message: dep.attributes.commit_message,
    commit_author: dep.attributes.commit_author,
    failure_reason: dep.attributes.failure_reason,
    started_at: dep.attributes.started_at,
    finished_at: dep.attributes.finished_at,
  }));
}
