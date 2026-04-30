import { List, Icon, getPreferenceValues } from "@raycast/api";
import { useMemo, useCallback } from "react";
import { useModelsData } from "./hooks/useModelsData";
import { ModelListSection } from "./components";
import { filterByReleasedWithinDays, filterOutDeprecated, sortByProviderThenName } from "./lib/filters";
import { getReleaseDateAccessories } from "./lib/accessories";
import { Model } from "./lib/types";

export default function NewAIModels() {
  const { data, isLoading } = useModelsData();
  const { lookbackPeriod } = getPreferenceValues<Preferences.NewModels>();
  const days = Math.max(1, parseInt(lookbackPeriod, 10) || 7);

  const filteredModels = useMemo(() => {
    if (!data?.models) return [];

    let models = filterOutDeprecated(data.models);
    models = filterByReleasedWithinDays(models, days);
    models = sortByProviderThenName(models);

    return models;
  }, [data?.models, days]);

  const getAccessories = useCallback((model: Model) => getReleaseDateAccessories(model), []);

  return (
    <List
      isLoading={isLoading && !data?.models?.length}
      searchBarPlaceholder="Search recent models by name or provider..."
    >
      <List.EmptyView
        title="No Recent Models"
        description={`No models released in the last ${days} days`}
        icon={Icon.Calendar}
      />
      <ModelListSection
        models={filteredModels}
        title={`Models released in the last ${days} days`}
        subtitle={`${filteredModels.length} models`}
        getAccessories={getAccessories}
      />
    </List>
  );
}
