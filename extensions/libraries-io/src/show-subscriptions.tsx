import { getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PackageResult } from "./components/PackageResult";
import type { Preferences, Subscription } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading } = useFetch<Subscription[]>(
    `https://libraries.io/api/subscriptions?api_key=${preferences.token}`
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter subscriptions..." enableFiltering throttle>
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <PackageResult key={searchResult.project.name} searchResult={searchResult.project} />
        ))}
      </List.Section>
    </List>
  );
}
