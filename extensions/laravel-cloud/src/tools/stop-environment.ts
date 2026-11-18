import { Tool } from "@raycast/api";
import { stopEnvironment } from "../api/environments";

type Input = {
  /** The ID of the environment to stop */
  environmentId: string;
};

export default async function (input: Input) {
  await stopEnvironment(input.environmentId);
  return { success: true, environmentId: input.environmentId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to stop this environment?`,
    info: [{ name: "Environment ID", value: input.environmentId }],
  };
};
