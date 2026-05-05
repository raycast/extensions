import { getAccessToken } from "@raycast/utils";

export interface CustomAgent {
  name: string;
  repo_owner: string | null;
  repo_name: string | null;
  display_name: string;
}

interface GetCustomAgentsResponse {
  agents: CustomAgent[];
}

export async function getCustomAgents(nameWithOwner: string): Promise<CustomAgent[]> {
  const { token } = getAccessToken();

  const getCustomAgentsResponse = await fetch(
    `https://api.githubcopilot.com/agents/swe/custom-agents/${nameWithOwner}?exclude_invalid_config=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Copilot-Integration-Id": "copilot-raycast",
      },
    },
  );

  if (getCustomAgentsResponse.status === 404) {
    return [];
  }

  if (!getCustomAgentsResponse.ok) {
    throw new Error(`Failed to list custom agents: ${getCustomAgentsResponse.statusText}`);
  }

  const getCustomAgentsResult = (await getCustomAgentsResponse.json()) as GetCustomAgentsResponse;
  return getCustomAgentsResult.agents;
}
