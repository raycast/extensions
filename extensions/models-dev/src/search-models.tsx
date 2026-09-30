import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { ModelsList } from "./components/ModelsList";
import { fetchModelsData } from "./lib/api";
import { filterOutDeprecated } from "./lib/filters";

export default function SearchModels() {
  // No initialData/keepPreviousData: holding a bundled snapshot copy alongside the
  // fetched catalog kept two full datasets resident and blew the 100 MB JS heap.
  // useCachedPromise already persists the last result across launches.
  const { data, isLoading } = useCachedPromise(fetchModelsData, []);

  const models = useMemo(() => filterOutDeprecated(data?.models ?? []), [data?.models]);

  return (
    <ModelsList
      models={models}
      isLoading={isLoading}
      searchBarPlaceholder="Search models by name, provider, or capability..."
    />
  );
}
