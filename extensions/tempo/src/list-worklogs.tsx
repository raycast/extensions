import { ActionPanel, Action, Icon, List, showToast, Toast, Color, Form } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchFromTempoAPI } from "./services/tempo.service";
import { getIssueKeysMap } from "./services/jira.service";
import { formatDuration, parseDuration } from "./utils/duration";
import { formatDate, getDateRange } from "./utils/date";
import { Worklog, WorklogsByDate, TempoWorklogsResponse } from "./types/worklog";
import { groupWorklogsByDate, sortWorklogsByTime } from "./utils/worklogs";
import { addToFavorites, isFavorite, getFavorites } from "./utils/favorites";
import { getCurrentUserAccountId, resetCachedAccountId } from "./services/jira-auth.service";

export default function Command() {
  const [worklogs, setWorklogs] = useState<WorklogsByDate>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [weeksLoaded, setWeeksLoaded] = useState(1); // Start with 1 week (7 days)
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());

  async function fetchWorklogs(weeks = 1) {
    try {
      setIsLoading(true);

      // Get the current user's account ID
      const jiraAccountId = await getCurrentUserAccountId();

      // Get worklogs for the specified number of weeks
      const { fromDate, toDate } = getDateRange(weeks * 7);

      // Fetch worklogs for the specific user account with pagination
      const response = (await fetchFromTempoAPI(
        `/worklogs/user/${jiraAccountId}?from=${fromDate}&to=${toDate}&limit=1000`,
      )) as TempoWorklogsResponse;

      // Fetch issue keys and summaries from Jira API
      const issueKeysMap = await getIssueKeysMap(response.results || []);

      // Map worklogs with issue details
      const worklogsWithDetails =
        response.results?.map((worklog) => {
          const issueData = issueKeysMap[worklog.issue.id];
          return {
            ...worklog,
            issue: {
              ...worklog.issue,
              key: issueData?.key || `Issue-${worklog.issue.id}`,
              summary: issueData?.summary || "",
              iconUrl: issueData?.iconUrl,
            },
          };
        }) || [];

      // Group worklogs by date
      const grouped = groupWorklogsByDate(worklogsWithDetails);

      // Sort worklogs within each day by startTime (chronologically)
      sortWorklogsByTime(grouped);

      setWorklogs(grouped);
      setIsLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch worklogs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsLoading(false);
    }
  }

  async function loadMoreWorklogs() {
    if (isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      const nextWeeks = weeksLoaded + 1;
      setWeeksLoaded(nextWeeks);
      await fetchWorklogs(nextWeeks);
      setIsLoadingMore(false);
    } catch (error) {
      setIsLoadingMore(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load more",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function deleteWorklog(worklogId: number) {
    try {
      await fetchFromTempoAPI(`/worklogs/${worklogId}`, { method: "DELETE" });

      showToast({
        style: Toast.Style.Success,
        title: "Worklog deleted",
      });

      // Refresh worklogs with current weeks loaded
      await fetchWorklogs(weeksLoaded);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete worklog",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function editWorklogDuration(worklog: Worklog, newDuration: string) {
    try {
      const totalSeconds = parseDuration(newDuration);

      if (totalSeconds <= 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid duration",
          message: "Please enter a valid duration (e.g., 1h30m, 2h, 45m)",
        });
        return;
      }

      // Get the current user's account ID
      const jiraAccountId = await getCurrentUserAccountId();

      await fetchFromTempoAPI(`/worklogs/${worklog.tempoWorklogId}`, {
        method: "PUT",
        body: JSON.stringify({
          authorAccountId: jiraAccountId,
          issueId: worklog.issue.id,
          timeSpentSeconds: totalSeconds,
          startDate: worklog.startDate,
          startTime: worklog.startTime || "09:00:00",
          description: worklog.description || "",
        }),
      });

      showToast({
        style: Toast.Style.Success,
        title: "Worklog updated",
      });

      // Refresh worklogs with current weeks loaded
      await fetchWorklogs(weeksLoaded);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update worklog",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleResetCache() {
    try {
      await resetCachedAccountId();
      await showToast({ style: Toast.Style.Success, title: "Cache reset", message: "Cache has been cleared" });
      // Refresh worklogs to fetch account ID again
      setWeeksLoaded(1);
      await fetchWorklogs(1);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to reset cache",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  useEffect(() => {
    fetchWorklogs(1);
  }, []);

  useEffect(() => {
    async function loadFavorites() {
      const favorites = await getFavorites();
      setFavoriteKeys(new Set(favorites.map((fav) => fav.key)));
    }
    loadFavorites();
  }, []);

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(worklogs).sort((a, b) => b.localeCompare(a));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search worklogs...">
      <List.EmptyView
        icon={Icon.Calendar}
        title="No worklogs found"
        description={`No worklogs in the last ${weeksLoaded} week${weeksLoaded > 1 ? "s" : ""}`}
        actions={
          <ActionPanel>
            <Action
              title="Reset Cache"
              icon={Icon.RotateClockwise}
              onAction={handleResetCache}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel>
        }
      />
      {sortedDates.map((date) => {
        const { worklogs: dateWorklogs, totalSeconds } = worklogs[date];
        return (
          <List.Section key={date} title={formatDate(date)} subtitle={formatDuration(totalSeconds)}>
            {dateWorklogs.map((worklog) => {
              const isFav = favoriteKeys.has(worklog.issue?.key || "");
              const accessories: List.Item.Accessory[] = [];
              if (isFav) {
                accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
              }
              accessories.push({ text: formatDuration(worklog.timeSpentSeconds) });

              return (
                <List.Item
                  key={worklog.tempoWorklogId}
                  icon={worklog.issue?.iconUrl || { source: Icon.Clock, tintColor: Color.Blue }}
                  title={worklog.issue?.key || "Unknown Issue"}
                  subtitle={worklog.issue?.summary || worklog.description || ""}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Edit Duration"
                        icon={Icon.Pencil}
                        target={
                          <Form
                            actions={
                              <ActionPanel>
                                <Action.SubmitForm
                                  title="Update Duration"
                                  onSubmit={(values: { duration: string }) => {
                                    editWorklogDuration(worklog, values.duration);
                                  }}
                                />
                              </ActionPanel>
                            }
                          >
                            <Form.TextField
                              id="duration"
                              title="Duration"
                              placeholder="e.g., 1h30m, 2h, 45m"
                              defaultValue={formatDuration(worklog.timeSpentSeconds)}
                              info="Enter duration in Tempo format: hours (h) and/or minutes (m). Examples: 1h30m, 2h, 45m, 1.5h"
                            />
                          </Form>
                        }
                      />
                      <Action
                        title="Delete Worklog"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => deleteWorklog(worklog.tempoWorklogId)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      />
                      <Action
                        title="Add Issue to Favorites"
                        icon={Icon.Star}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={async () => {
                          const isAlreadyFavorite = await isFavorite(worklog.issue?.key || "");
                          if (isAlreadyFavorite) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Already in Favorites",
                              message: worklog.issue?.key || "",
                            });
                          } else {
                            await addToFavorites(worklog.issue?.key || "", worklog.issue?.summary || "");
                            // Update local state
                            const favorites = await getFavorites();
                            setFavoriteKeys(new Set(favorites.map((fav) => fav.key)));
                            await showToast({
                              style: Toast.Style.Success,
                              title: "Added to Favorites",
                              message: worklog.issue?.key || "",
                            });
                          }
                        }}
                      />
                      <Action.CopyToClipboard title="Copy Issue Key" content={worklog.issue?.key || ""} />
                      {worklog.issue?.summary && (
                        <Action.CopyToClipboard
                          title="Copy Issue Title"
                          content={worklog.issue.summary}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                      )}
                      <ActionPanel.Section title="Settings">
                        <Action
                          title="Reset Cache"
                          icon={Icon.RotateClockwise}
                          onAction={handleResetCache}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
      {sortedDates.length > 0 && !isLoading && (
        <List.Item
          key="load-more"
          icon={{ source: Icon.ArrowDown, tintColor: Color.Orange }}
          title={isLoadingMore ? "Loading more..." : "Load More Worklogs"}
          subtitle={`Currently showing ${weeksLoaded} week${weeksLoaded > 1 ? "s" : ""} • Load 1 more week`}
          actions={
            <ActionPanel>
              <Action title="Load More" icon={Icon.ArrowDown} onAction={loadMoreWorklogs} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
