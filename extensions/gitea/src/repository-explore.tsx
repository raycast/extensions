import { Action, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { RepositoryDropdown, RepositoryList } from "./components/repositories";
import { useRepositories } from "./hooks/useRepositories";
import { RepositorySort, RepositorySortOptions } from "./domain/repository-sort";
import CreateIssue from "./issue-create";
import type { Repository } from "./types/api";
import { CacheKey } from "./constants";

export default function Command() {
  const [sort, setSort] = useCachedState<RepositorySort>(`${CacheKey.Repositories}-sort`, RepositorySort.MostStars);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const { items, isLoading, pagination } = useRepositories(sort);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetails}
      searchBarAccessory={
        <RepositoryDropdown repoFilter={RepositorySortOptions} onFilterChange={(newValue) => setSort(newValue)} />
      }
      pagination={pagination}
      throttle
    >
      <RepositoryList
        items={items}
        sort={sort}
        showDetails={showDetails}
        setShowDetails={setShowDetails}
        getCreateIssueAction={getCreateIssueAction}
      />
    </List>
  );
}

function getCreateIssueAction(item: Repository) {
  return item.full_name ? (
    <Action.Push
      title="Create Issue"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateIssue initialRepo={item} />}
    />
  ) : null;
}
