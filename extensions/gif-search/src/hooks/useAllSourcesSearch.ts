import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";

import { AllSourcesCursor, fetchAllSourcesPage, SourceFailure } from "../lib/allSources";
import dedupe from "../lib/dedupe";
import { getServiceTitle, ServiceName } from "../preferences";
import { getAPIByServiceName } from "./useSearchAPI";

type UseAllSourcesSearchParams = {
  term: string;
  services: ServiceName[];
  limit: number;
  execute: boolean;
};

export default function useAllSourcesSearch({ term, services, limit, execute }: UseAllSourcesSearchParams) {
  const [failures, setFailures] = useState<SourceFailure[]>([]);

  const search = useCachedPromise(
    (term: string, servicesKey: string) =>
      async ({ page, cursor }: { page: number; cursor?: AllSourcesCursor }) => {
        const result = await fetchAllSourcesPage(
          servicesKey.split(",") as ServiceName[],
          page === 0 ? {} : (cursor ?? {}),
          limit,
          async (service, opt) => {
            const api = await getAPIByServiceName(service);
            if (!api) return { results: [], next: "" };
            return term ? api.search(term, { limit, ...opt }) : api.trending({ limit, ...opt });
          },
        );

        // Failing on a later page keeps the GIFs already shown, so only a failed first page counts as an error.
        if (result.allFailed && page === 0) {
          throw new Error(result.failures.map((f) => `${getServiceTitle(f.service)}: ${f.error.message}`).join("\n"));
        }

        setFailures(result.failures);
        return { data: result.results, hasMore: result.hasMore, cursor: result.cursor };
      },
    [term, services.join(",")],
    {
      execute,
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load GIFs from any source" },
    },
  );

  return { ...search, data: dedupe(search.data ?? []), failures };
}
