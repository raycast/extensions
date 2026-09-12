import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { PackageResult } from "./components/PackageResult";
import type { Package, PackageSearchArguments, Preferences } from "./types";

export default function Command(props: { arguments: PackageSearchArguments }) {
  const [searchText, setSearchText] = useState("");
  const { platform } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const { data, error } = useFetch<Package[]>(
    `https://libraries.io/api/search?q=${searchText}&platforms=${platform}&api_key=${preferences.token}`,
    {
      execute: searchText !== "",
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
    <List
      isLoading={!data && !error && searchText !== ""}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search packages on Libraries.io..."
      throttle
    >
      <List.EmptyView icon="no-view.png" description="No Results" />
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <PackageResult key={searchResult.name + searchResult.platform} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}
