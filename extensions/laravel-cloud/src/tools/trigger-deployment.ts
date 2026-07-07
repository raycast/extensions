import { Tool } from "@raycast/api";
import { triggerDeployment } from "../api/deployments";

type Input = {
  /** The ID of the environment to deploy */
  environmentId: string;
};

export default async function (input: Input) {
  const response = await triggerDeployment(input.environmentId);
  const dep = response.data;
  return {
    id: dep.id,
    status: dep.attributes.status,
    branch_name: dep.attributes.branch_name,
    commit_hash: dep.attributes.commit_hash,
    commit_message: dep.attributes.commit_message,
    started_at: dep.attributes.started_at,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to trigger a deployment?`,
    info: [{ name: "Environment ID", value: input.environmentId }],
  };
};
