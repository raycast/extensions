import type { CodeManager } from "../CodeManager";
import type { GitHubManager } from "../GitHubManager";
import { List } from "@raycast/api";
import type { Owner } from "../types";
import { RepositoriesListItem } from "./RepositoriesListItem";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

export function RepositoriesList({
  codeManager,
  githubManager,
  owner,
}: {
  codeManager: CodeManager;
  githubManager: GitHubManager;
  owner: Owner;
}) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useCachedPromise(
    (_owner: Owner, _searchText: string) => githubManager.searchRepositories(_owner, _searchText),
    [owner, searchText],
    { keepPreviousData: true }
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search GitHub repositories..."
      searchText={searchText}
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((repository) => (
          <RepositoriesListItem key={repository.cloneUrl} codeManager={codeManager} repository={repository} />
        ))}
      </List.Section>
    </List>
  );
}
