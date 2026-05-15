import { Action, ActionPanel, Icon, Keyboard, List, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { usePullRequests } from "./hooks/usePullRequests";
import { useCurrentUser } from "./hooks/useCurrentUser";
import CreateIssue from "./issue-create";
import { getPullRequestIcon } from "./utils/icons";
import type { Repository } from "./types/api";

type PullRequestCommandPreferences = {
  includeCreated: boolean;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeReviewRequested: boolean;
  includeReviewed: boolean;
  includeRecentlyClosed: boolean;
  includeOwnedRepositories: boolean;
};

enum PullRequestCategory {
  All = "all",
  Created = "created",
  Assigned = "assigned",
  Mentioned = "mentioned",
  ReviewRequested = "review_requested",
  Reviewed = "reviewed",
  OwnedRepositories = "owned_repositories",
}

const categoryOptions = [
  { title: "All", value: PullRequestCategory.All },
  { title: "Created by you", value: PullRequestCategory.Created },
  { title: "Assigned to you", value: PullRequestCategory.Assigned },
  { title: "Mentioning you", value: PullRequestCategory.Mentioned },
  { title: "Review requested", value: PullRequestCategory.ReviewRequested },
  { title: "Reviewed by you", value: PullRequestCategory.Reviewed },
  { title: "Repositories you own", value: PullRequestCategory.OwnedRepositories },
];

export default function Command() {
  const prefs = getPreferenceValues<PullRequestCommandPreferences>();
  const [selectedCategory, setSelectedCategory] = useCachedState<string>(
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
      return timeValue(a.updated_at) - timeValue(b.updated_at);
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
          onChange={(value) => setSelectedCategory(value)}
        >
          {categoryOptions.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
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
          <List.Item
            key={pr.id || pr.number || pr.title || "pull-request"}
            title={pr.title || "[No Title]"}
            subtitle={pr.repository?.full_name || "[No Repository]"}
            icon={getPullRequestIcon(pr.state, pr.title, pr.pull_request)}
            accessories={[{ text: `#${pr.number ?? ""}` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {pr.html_url && (
                    <Action.OpenInBrowser
                      title="Open Pull Request"
                      url={pr.html_url}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  {pr.html_url && (
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={pr.html_url}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  )}
                  {pr.number != null && (
                    <Action.CopyToClipboard title="Copy Pull Request Number" content={`#${pr.number}`} />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {pr.repository?.full_name && (
                    <Action.Push
                      title="Create Issue"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={<CreateIssue initialRepo={pr.repository as Repository} />}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
