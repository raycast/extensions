import { List } from "@raycast/api";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useHistory } from "./history";
import { preferences } from "./preferences";
import { useRepositories } from "./github";
import { FilterDropdown } from "./FilterDropdown";
import { RepositoryListItem } from "./RepositoryListItem";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [searchFilter, setSearchFilter] = useState<string | null>(null);

  const [debouncedSearchText] = useDebounce(searchText, 200);
  const { data: history, visitRepository } = useHistory(searchText, searchFilter);
  const { data: repositories, isLoading } = useRepositories(
    `${searchFilter} ${debouncedSearchText} fork:${preferences.includeForks}`
  );

  return (
    <List
      isLoading={searchText !== debouncedSearchText || isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<FilterDropdown onFilterChange={setSearchFilter} />}
    >
      <List.Section title="Visited Repositories" subtitle={history ? String(history.length) : undefined}>
        {history.map((repository) => (
          <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
        ))}
      </List.Section>
      <List.Section
        title="Found Repositories"
        subtitle={repositories ? String(repositories.search.repositoryCount) : undefined}
      >
        {repositories?.search.nodes?.map((repository) => (
          <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
        ))}
      </List.Section>
    </List>
  );
}
