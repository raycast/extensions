import { usePlanetScaleClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";

export function useDatabases(args: { organization?: string }) {
  const pscale = usePlanetScaleClient();

  const { data: databases, isLoading: databasesLoading } = useCachedPromise(
    async (key, { organization }) => {
      const response = await pscale.listDatabases({
        page: 1,
        per_page: 25,
        organization,
      });
      return response.data.data;
    },
    ["databases", args],
    {
      initialData: [],
      execute: !!args.organization,
    },
  );
  return { databases, databasesLoading };
}
