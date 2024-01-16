import { getPlanetScaleClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";

export function useDeployOperations(args: { organization?: string; database?: string; number: string }) {
  const pscale = getPlanetScaleClient();

  const { data: deployOperations, isLoading: deployOperationsLoading } = useCachedPromise(
    async (key, { number, organization, database }) => {
      const response = await pscale.listDeployOperations({
        number,
        organization,
        database,
      });
      return response.data.data;
    },
    ["deploy-request-operations", args],
    {
      initialData: [],
    },
  );

  return { deployOperations, deployOperationsLoading };
}
