import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { PipelineListSection } from "./components/PipelineListSection";
import { getBuildkiteClient } from "./api/withBuildkiteClient";
import { useCachedPromise } from "@raycast/utils";
import { truthy } from "./utils/truthy";
import View from "./components/View";

function Pipelines() {
  const { org } = getPreferenceValues();
  const [search, setSearch] = useState("");
  const buildkite = getBuildkiteClient();
  const { data, isLoading } = useCachedPromise(
    async (org: string, search: string) => {
      const result = await buildkite.searchPipelines({ org, search });
      return result.organization?.pipelines?.edges?.map((edge) => edge?.node).filter(truthy);
    },
    [org, search],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter pipelines by name..."
      onSearchTextChange={(search) => setSearch(search)}
      throttle
    >
      <PipelineListSection title="Favorites" pipelines={data?.filter((node) => node.favorite) ?? []} />
      <PipelineListSection title="All pipelines" pipelines={data?.filter((node) => !node.favorite) ?? []} />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <Pipelines />
    </View>
  );
}
