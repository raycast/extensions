import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { RepositoryDropdown, RepositoryList } from "./components/repositories";
import { useRepositories } from "./hooks/useRepositories";
import { RepositorySortOption, RepositorySortTypes } from "./types/sorts/repository-search";

export default function Command() {
  const [sort, setSort] = useCachedState<RepositorySortOption>(RepositorySortOption.MostStars);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const { items, isLoading, pagination } = useRepositories(sort);

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
