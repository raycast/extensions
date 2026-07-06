import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { ModelsList } from "./components/ModelsList";
import { fetchModelsData, INITIAL_MODELS_DATA } from "./lib/api";
import { filterOutDeprecated } from "./lib/filters";

export default function SearchModels() {
  const { data, isLoading } = useCachedPromise(fetchModelsData, [], {
    initialData: INITIAL_MODELS_DATA,
    keepPreviousData: true,
  });

  const models = useMemo(() => filterOutDeprecated(data?.models ?? []), [data?.models]);

  return (
    <ModelsList
      models={models}
      isLoading={isLoading}
      searchBarPlaceholder="Search models by name, provider, or capability..."
    />
  );
}
