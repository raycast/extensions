import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PackageResult } from "./components/PackageResult";
import type { Preferences, Subscription } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading } = useFetch<Subscription[]>(
    `https://libraries.io/api/subscriptions?api_key=${preferences.token}`,
    {
      onError: (error) => {
        showToast(
          Toast.Style.Failure,
          "Error",
          error.message === "Forbidden" ? "Check credentials and try again" : error.message
        );
      },
    }
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter subscriptions..." enableFiltering throttle>
      <List.EmptyView icon="no-view.png" description="No Results" />
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <PackageResult key={searchResult.project.name} searchResult={searchResult.project} />
        ))}
      </List.Section>
    </List>
  );
}
