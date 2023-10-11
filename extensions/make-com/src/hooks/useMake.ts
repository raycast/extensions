import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import type { Scenario, Scenarios } from "../types/make";
import type { Preferences, RunScenarioResponse } from "../types/raycast";

export default function useMake() {
  const { makeApiKey, environmentUrl, organizationId, skipWebhooks } =
    getPreferenceValues<Preferences>();

  const { data: scenariosData, error: scenariosError } = useFetch<{
    scenarios: Scenarios;
  }>(
    `${environmentUrl}/api/v2/scenarios?organizationId=${organizationId}&pg[limit]=10000`,
    {
      headers: {
        Authorization: `Token ${makeApiKey}`,
      },
      keepPreviousData: true,
      execute: makeApiKey && environmentUrl && organizationId ? true : false,
    }
  );

  const skipPausedFilter = ({ islinked }: Scenario) => islinked;

  const skipWebhooksFilter = ({ usedPackages }: Scenario) =>
    skipWebhooks ? usedPackages[0] !== "gateway" : true;

  const runScenario = async (
    scenarioId: number
  ): Promise<RunScenarioResponse> => {
    const response = await fetch(
      `${environmentUrl}/api/v2/scenarios/${scenarioId}/run`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${makeApiKey}`,
        },
      }
    );

    if (!response.ok) {
      const details = (await response.json()) as unknown as { detail: string };
      throw new Error(`Running Scenario failed: ${details.detail}`);
    }

    return response.json() as unknown as RunScenarioResponse;
  };

  return {
    scenarios: scenariosData?.scenarios
      .filter(skipPausedFilter)
      .filter(skipWebhooksFilter),
    error: scenariosError,
    runScenario,
    environmentUrl,
  };
}
