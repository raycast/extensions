import { Tool } from "@raycast/api";
import { addEnvironmentVariables } from "../api/environments";

type Input = {
  /** The ID of the environment to set variables on */
  environmentId: string;
  /** Array of environment variables to set, each with a "key" and "value" */
  variables: { key: string; value: string }[];
};

export default async function (input: Input) {
  const response = await addEnvironmentVariables(input.environmentId, input.variables);
  return response.data.attributes.environment_variables.map((v) => ({
    key: v.key,
    value: v.value,
  }));
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to set environment variables?`,
    info: [
      { name: "Environment ID", value: input.environmentId },
      { name: "Variables", value: input.variables.map((v) => v.key).join(", ") },
    ],
  };
};
