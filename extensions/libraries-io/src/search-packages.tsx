import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { PackageResult } from "./components/PackageResult";
import type { Package } from "./types";

export default function Command(props: { arguments: PackageSearchArguments }) {
  const [searchText, setSearchText] = useState("");
  const { platform } = props.arguments
  const { data, isLoading } = useFetch<Package[]>(`https://libraries.io/api/search?q=${searchText}&platforms=${platform}`, {
    execute: searchText !== "",
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
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
