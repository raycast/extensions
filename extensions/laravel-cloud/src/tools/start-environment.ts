import { Tool } from "@raycast/api";
import { startEnvironment } from "../api/environments";

type Input = {
  /** The ID of the environment to start */
  environmentId: string;
};

export default async function (input: Input) {
  await startEnvironment(input.environmentId);
  return { success: true, environmentId: input.environmentId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to start this environment?`,
    info: [{ name: "Environment ID", value: input.environmentId }],
  };
};
