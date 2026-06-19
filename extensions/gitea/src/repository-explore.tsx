import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { RepositoryDropdown, RepositoryList } from "./components/repositories";
import { useRepositories } from "./hooks/useRepositories";
import { RepositorySort, RepositorySortOptions } from "./domain/repository-sort";

import { CacheKey } from "./constants";

export default function Command() {
  const [sort, setSort] = useCachedState<RepositorySort>(`${CacheKey.Repositories}-sort`, RepositorySort.MostStars);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");

  const { items, isLoading, pagination } = useRepositories(sort, searchText);

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={showDetails}
      searchBarAccessory={
        <RepositoryDropdown
          repoFilter={RepositorySortOptions}
          value={sort}
          onFilterChange={(newValue) => setSort(newValue)}
        />
      }
      onSearchTextChange={setSearchText}
      pagination={pagination}
      throttle
    >
      <RepositoryList items={items} sort={sort} showDetails={showDetails} setShowDetails={setShowDetails} />
    </List>
  );
}
