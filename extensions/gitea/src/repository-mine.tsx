import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { RepositoryDropdown, RepositoryList } from "./components/repositories";
import { useUserRepositories } from "./hooks/useUserRepositories";
import { RepositorySort, RepositorySortOptions } from "./domain/repository-sort";

import { useState } from "react";
import { CacheKey } from "./constants";

export default function Command() {
  const [sort, setSort] = useCachedState<RepositorySort>(
    `${CacheKey.UserRepositories}-sort`,
    RepositorySort.RecentlyUpdated,
  );
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");

  const { items, isLoading, pagination } = useUserRepositories(sort, searchText);

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
