import { usePlanetScaleClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";
import { range } from "lodash";

export function useDeployOperations(args: { organization?: string; database?: string; number: string }) {
  const pscale = usePlanetScaleClient();

  const { data: deployOperations, isLoading: deployOperationsLoading } = useCachedPromise(
    async (key, { number, organization, database }) => {
      // Fetch multiple pages of deploy operations
      const jobs = range(1, 3).map((page) =>
        pscale.listDeployOperations({
          page,
          per_page: 100,
          number,
          organization,
          database,
        }),
      );
      const responses = await Promise.all(jobs);
      return responses.map((job) => job.data.data).flat();
    },
    ["deploy-request-operations", args],
    {
      initialData: [],
      execute: !!args.organization && !!args.database && !!args.number,
    },
  );

  return { deployOperations, deployOperationsLoading };
}
