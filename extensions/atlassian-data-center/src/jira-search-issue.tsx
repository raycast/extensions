import { useState, useMemo, useEffect } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";

import { SearchFilter, withQuery, CacheActions } from "@/components";
import { JiraIssueTransitionForm, JiraWorklogForm } from "@/pages";
import { COMMAND_NAME, PAGINATION_SIZE, QUERY_TYPE, JIRA_SEARCH_ISSUE_FILTERS } from "@/constants";
import JiraNotificationView from "@/jira-notification-view";
import {
  useJiraProjectsQuery,
  useJiraSearchInfiniteQuery,
  useJiraCurrentUser,
  useJiraUnreadNotificationsQuery,
  useJiraNotificationAvailableCachedState,
  useRefetchWithToast,
  useFetchNextPageWithToast,
} from "@/hooks";
import {
  getSectionTitle,
  processUserInputAndFilter,
  buildQuery,
  copyToClipboardWithToast,
  replaceQueryCurrentUser,
  isIssueKey,
  isIssueNumber,
  clearJiraNotificationsCounter,
} from "@/utils";
import type { ProcessedJiraIssue, SearchFilter as SelectedFilter } from "@/types";

const EMPTY_INFINITE_DATA = { list: [], total: 0 };
const DEFAULT_FILTER = JIRA_SEARCH_ISSUE_FILTERS.find((item) => item.value === "updated_recently");

export default withQuery(JiraSearchIssues);

function JiraSearchIssues() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<SelectedFilter | null>(null);

  const { available: notificationAvailable, setAvailable: setNotificationAvailable } =
    useJiraNotificationAvailableCachedState();

  const {
    data: projectKeys,
    isFetched: isJiraProjectFetched,
    error: jiraProjectError,
  } = useJiraProjectsQuery({
    meta: { errorMessage: "Failed to Load Project" },
  });

  const { jql, filterForQuery } = useMemo(() => {
    const trimmedText = searchText.trim();

    let filterForQuery: SelectedFilter | null | undefined = filter;

    // If input is too short and filter is not auto-query, treat it as no input
    if (!trimmedText && filter && !filter.autoQuery) {
      return { jql: "", filterForQuery };
    }

    // If no input and "All Issues" is selected, show open issues by default
    const withoutUserInputAndFilter = !trimmedText && !filter;
    filterForQuery = withoutUserInputAndFilter ? DEFAULT_FILTER : filter;

    const buildClauseFromText = (input: string) => {
      if (isIssueKey(input)) {
        return `(summary ~ "${input}" OR issuekey in (${input}))`;
      }
      if (isIssueNumber(input) && projectKeys?.length) {
        const keys = projectKeys.map((key) => `${key}-${input}`).join(", ");
        return `(summary ~ "${input}" OR issuekey in (${keys}))`;
      }
      return `summary ~ "${input}"`;
    };

    const processedJQL = processUserInputAndFilter({
      userInput: trimmedText,
      filter: filterForQuery,
      buildClauseFromText,
      queryType: QUERY_TYPE.JQL,
    });

    if (typeof processedJQL === "string") {
      return { jql: processedJQL, filterForQuery };
    }

    const finalJQL = buildQuery({
      ...processedJQL,
      orderBy: processedJQL.orderBy || "updated DESC, created DESC",
      queryType: QUERY_TYPE.JQL,
    });

    return { jql: finalJQL, filterForQuery };
  }, [searchText, filter, projectKeys]);

  const jiraIssueEnabled = useMemo(() => {
    return (isJiraProjectFetched || !!jiraProjectError) && !!jql;
  }, [isJiraProjectFetched, jiraProjectError, jql]);

  const {
    data = EMPTY_INFINITE_DATA,
    isLoading,
    isSuccess,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useJiraSearchInfiniteQuery(jql, {
    enabled: jiraIssueEnabled,
    meta: { errorMessage: "Failed to Search Issue" },
  });

  const {
    data: unreadNotificationsCount = 0,
    refetch: refetchUnreadNotifications,
    error: unreadNotificationsError,
  } = useJiraUnreadNotificationsQuery({
    enabled: notificationAvailable,
  });

  const { currentUser } = useJiraCurrentUser();

  const fetchNextPageWithToast = useFetchNextPageWithToast({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const refetchWithToast = useRefetchWithToast({ refetch });

  useEffect(() => {
    if (unreadNotificationsError && unreadNotificationsError.message.includes("404")) {
      setNotificationAvailable(false);
    }
  }, [unreadNotificationsError]);

  const isEmpty = isSuccess && !data.list.length;

  const sectionTitle = getSectionTitle(filterForQuery, {
    fetchedCount: data.list.length,
    totalCount: data?.total || 0,
  });

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
  };

  const handleViewMoreNotifications = () => {
    clearJiraNotificationsCounter().catch(() => {});
  };

  const copyJQL = async () => {
    const getFinalJQL = (issues: ProcessedJiraIssue[]) => {
      // 1. Find the string with "OR issuekey in (...)" and split it into three parts
      const orKeyInMatch = jql.match(/(.*?)\s+OR\s+issuekey\s+in\s*\(([^)]+)\)(.*)/i);

      // 2. If there is no "OR issuekey in" part, return the original JQL
      if (!orKeyInMatch) {
        return jql;
      }

      const [, beforePart, keysPart, afterPart] = orKeyInMatch;

      // 3. Compare each issue key and remove those that do not exist in the current issues
      const originalKeys = keysPart.split(",").map((key) => key.trim());
      const existingKeys = issues.map((issue) => issue.key);
      const filteredKeys = originalKeys.filter((key) => existingKeys.includes(key));

      // 4. If there are no existing issue keys after filtering, this part becomes an empty string
      let filteredKeysPart = "";
      if (filteredKeys.length > 0) {
        filteredKeysPart = ` OR issuekey in (${filteredKeys.join(", ")})`;
      }

      // 5. Recombine the JQL from the three parts
      const filteredJQL = beforePart.trim() + filteredKeysPart + afterPart;
      return filteredJQL;
    };

    let finalJQL = !searchText || !isIssueNumber(searchText) ? jql : getFinalJQL(data.list);

    if (currentUser?.name) {
      finalJQL = replaceQueryCurrentUser(finalJQL, currentUser.name);
    }

    await copyToClipboardWithToast(finalJQL);
  };

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Search by summary, key..."
      searchBarAccessory={
        <SearchFilter commandName={COMMAND_NAME.JIRA_SEARCH_ISSUE} value={filter?.value || ""} onChange={setFilter} />
      }
      pagination={{
        hasMore: hasNextPage,
        onLoadMore: fetchNextPageWithToast,
        pageSize: PAGINATION_SIZE,
      }}
    >
      {isEmpty ? (
        <NoIssuesEmptyView jql={jql} />
      ) : (
        <>
          {unreadNotificationsCount > 0 && (
            <List.Section title="Notifications">
              <List.Item
                icon={{ source: Icon.Bell, tintColor: Color.Red }}
                title={`You have ${unreadNotificationsCount} unread ${unreadNotificationsCount > 1 ? "notifications" : "notification"}`}
                accessories={[{ tag: { value: `${unreadNotificationsCount}`, color: "#f44336" } }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.Bell}
                      title="View More"
                      target={<JiraNotificationView />}
                      onPush={handleViewMoreNotifications}
                      onPop={() => {
                        refetchUnreadNotifications();
                      }}
                    />
                    <CacheActions />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title={sectionTitle}>
            {data.list.map((item) => (
              <List.Item
                key={item.renderKey}
                title={item.title}
                subtitle={item.subtitle}
                icon={item.icon}
                accessories={item.accessories}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={item.url} />
                    {item.editUrl && (
                      <Action.OpenInBrowser
                        icon={Icon.Pencil}
                        title="Edit in Browser"
                        url={item.editUrl}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                    )}
                    <Action.Push
                      title="Create Worklog"
                      target={<JiraWorklogForm issueKey={item.key} onUpdate={refetchWithToast} />}
                      icon={Icon.Clock}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    />
                    <Action.Push
                      icon={Icon.Switch}
                      title="Transition Status"
                      target={<JiraIssueTransitionForm issueKey={item.key} onUpdate={refetchWithToast} />}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={item.url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Key"
                      content={item.key}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    {jql && (
                      <Action
                        title="Copy JQL"
                        icon={Icon.CopyClipboard}
                        onAction={() => copyJQL()}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      />
                    )}
                    <Action
                      icon={Icon.ArrowClockwise}
                      title="Refresh"
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={refetchWithToast}
                    />
                    <CacheActions />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface NoIssuesEmptyViewProps {
  jql: string;
}

function NoIssuesEmptyView({ jql }: NoIssuesEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title="No Results"
      description="Try adjusting your search filters or check your JQL syntax"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JQL" content={jql} />
        </ActionPanel>
      }
    />
  );
}
