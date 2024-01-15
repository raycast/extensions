import { getPlanetScaleClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";

export function useDatabases(args: { organization?: string }) {
  const pscale = getPlanetScaleClient();

  const { data: databases, isLoading: databasesLoading } = useCachedPromise(
    async (key, { organization }) => {
      if (!organization) {
        return [];
      }
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
    },
  );
  return { databases, databasesLoading };
}
