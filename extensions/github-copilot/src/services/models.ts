import { getAccessToken } from "@raycast/utils";

export interface Model {
  name: string;
  id: string;
  billing?: {
    multiplier: number;
  };
}

interface GetModelsResponse {
  data: Model[];
}

export async function getModels(): Promise<Model[]> {
  const { token } = getAccessToken();

  const getModelsResponse = await fetch(`https://api.githubcopilot.com/agents/swe/models`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Copilot-Integration-Id": "copilot-raycast",
    },
  });

  if (!getModelsResponse.ok) {
    throw new Error(`Failed to list models: ${getModelsResponse.statusText}`);
  }

  const getModelsResult = (await getModelsResponse.json()) as GetModelsResponse;
  return getModelsResult.data;
}
