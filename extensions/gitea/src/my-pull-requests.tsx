import { Icon, List, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getIssueItemKey, IssueItem, IssueKind } from "./components/issues";
import { usePullRequests } from "./hooks/usePullRequests";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { getPullRequestIcon } from "./utils/icons";
import { PullRequestCategory, PullRequestCategoryOptions } from "./domain/issue-category";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.MyPullRequests>();
  const [selectedCategory, setSelectedCategory] = useCachedState<PullRequestCategory>(
    "pull-requests-category-filter",
    PullRequestCategory.All,
  );

  const effectiveFilters = useMemo(() => {
    if (selectedCategory === PullRequestCategory.All) {
      return {
        includeCreated: prefs.includeCreated ?? true,
        includeAssigned: prefs.includeAssigned ?? true,
        includeMentioned: prefs.includeMentioned ?? true,
        includeReviewRequested: prefs.includeReviewRequested ?? true,
        includeOwnedRepositories: prefs.includeOwnedRepositories ?? true,
        includeAccessibleRepositories: prefs.includeAccessibleRepositories ?? false,
        includeReviewed: prefs.includeReviewed ?? false,
        includeRecentlyClosed: prefs.includeRecentlyClosed ?? false,
      };
    }
    return {
      includeCreated: selectedCategory === PullRequestCategory.Created,
      includeAssigned: selectedCategory === PullRequestCategory.Assigned,
      includeMentioned: selectedCategory === PullRequestCategory.Mentioned,
      includeReviewRequested: selectedCategory === PullRequestCategory.ReviewRequested,
      includeReviewed: selectedCategory === PullRequestCategory.Reviewed,
      includeOwnedRepositories: selectedCategory === PullRequestCategory.OwnedRepositories,
      includeAccessibleRepositories: selectedCategory === PullRequestCategory.AccessibleRepositories,
      includeRecentlyClosed: prefs.includeRecentlyClosed ?? false,
    };
  }, [selectedCategory, prefs]);

  const [searchText, setSearchText] = useState<string>("");
  const { user, isLoading: isLoadingUser } = useCurrentUser(effectiveFilters.includeOwnedRepositories);
  const { items, isLoading, pagination } = usePullRequests({
    ...effectiveFilters,
    owner: user?.login,
    query: searchText,
  });

  const sortedItems = useMemo(() => {
    const stateRank = (state?: string) => (state?.toLowerCase() === "open" ? 0 : 1);
    const timeValue = (value?: string) => (value ? new Date(value).getTime() : 0);

    return [...items].sort((a, b) => {
      const byState = stateRank(a.state) - stateRank(b.state);
      if (byState !== 0) return byState;
      return timeValue(b.updated_at) - timeValue(a.updated_at);
    });
  }, [items]);

  return (
    <List
      isLoading={isLoading || isLoadingUser}
      searchBarPlaceholder="Search pull requests"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by category"
          value={selectedCategory}
          onChange={(value) => setSelectedCategory(value as PullRequestCategory)}
        >
          {PullRequestCategoryOptions.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.name} value={option.value} />
          ))}
        </List.Dropdown>
      }
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
    >
      {items.length === 0 ? (
        <List.EmptyView icon={Icon.Code} title="No pull requests found" />
      ) : (
        sortedItems.map((pr) => (
          <IssueItem
            key={getIssueItemKey(pr, IssueKind.PullRequest)}
            item={pr}
            kind={IssueKind.PullRequest}
            icon={getPullRequestIcon(pr.state, pr.pull_request)}
          />
        ))
      )}
    </List>
  );
}
