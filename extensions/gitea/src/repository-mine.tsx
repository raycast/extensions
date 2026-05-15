import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { RepositoryDropdown, RepositoryList } from "./components/repositories";
import { useUserRepositories } from "./hooks/useUserRepositories";
import { RepositorySortOption, RepositorySortTypes } from "./types/sorts/repository-search";

import { useState } from "react";

export default function Command() {
  const [sort, setSort] = useCachedState<RepositorySortOption>(RepositorySortOption.RecentlyUpdated);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const { items, isLoading, pagination } = useUserRepositories(sort);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetails}
      searchBarAccessory={
        <RepositoryDropdown
          repoFilter={RepositorySortTypes}
          onFilterChange={(newValue: string) => setSort(newValue as RepositorySortOption)}
        />
      }
      pagination={pagination}
      throttle
    >
      <RepositoryList items={items} sort={sort} showDetails={showDetails} setShowDetails={setShowDetails} />
    </List>
  );
}
