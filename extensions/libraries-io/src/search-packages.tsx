import { getPreferenceValues, List } from "@raycast/api";
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
    }
  );

  return (
    <List
      isLoading={!data && !error && searchText !== ""}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search packages on Libraries.io..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <PackageResult key={searchResult.name + searchResult.platform} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}
