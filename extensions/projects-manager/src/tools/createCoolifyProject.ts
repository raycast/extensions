import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * A unique name for the project, if not provided, the name should be randomly generated with lowercase letters and dashes
   */
  name: string;
  /**
   * The description of the project
   */
  description: string;
};

export default async function createCoolifyProject(input: Input): Promise<string> {
  const { coolifyToken } = getPreferenceValues<Preferences>();
  const response = await fetch("https://apps.joshuariley.co.uk/api/v1/projects", {
    headers: {
      Authorization: `Bearer ${coolifyToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
    }),
  });
  const result = await response.json();
  console.log(result);
  return result.uuid;
}
