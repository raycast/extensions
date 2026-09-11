import { getEnvironment } from "../api/environments";

type Input = {
  /** The ID of the environment whose variables to list */
  environmentId: string;
};

export default async function (input: Input) {
  const response = await getEnvironment(input.environmentId);
  return response.data.attributes.environment_variables.map((v) => ({
    key: v.key,
    value: v.value,
  }));
}
