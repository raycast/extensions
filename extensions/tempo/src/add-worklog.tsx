import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  List,
  Icon,
  Color,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchFromTempoAPI } from "./services/tempo.service";
import {
  getAssignedIssues,
  getProjectIssues,
  searchIssues,
  JiraIssue,
  getIssueByKey,
  getProjectByKey,
} from "./services/jira-issues.service";
import { getFavorites, addToFavorites, removeFromFavorites, FavoriteIssue } from "./utils/favorites";
import { getRecentActivityIssues, JiraIssue as RecentJiraIssue } from "./services/jira-recent-activity.service";
import { parseDuration, formatDuration } from "./utils/duration";
import { getCurrentUserAccountId, resetCachedAccountId } from "./services/jira-auth.service";
import { formatDateToString, getDateLabel } from "./utils/date";
import { TempoWorklogsResponse } from "./types/worklog";

interface Preferences {
  defaultProjectKey?: string;
}

type Values = {
  issueKey: string;
  description: string;
  date: string;
  customDate?: string;
  timeSpent: string;
};

function IssueSelector({ onSelect }: { onSelect: (issueKey: string) => void }) {
  const [favoriteIssues, setFavoriteIssues] = useState<FavoriteIssue[]>([]);
  const [recentActivityIssues, setRecentActivityIssues] = useState<RecentJiraIssue[]>([]);
  const [assignedIssues, setAssignedIssues] = useState<JiraIssue[]>([]);
  const [projectIssues, setProjectIssues] = useState<JiraIssue[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<JiraIssue[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { defaultProjectKey } = getPreferenceValues<Preferences>();

  async function loadIssues() {
    try {
      setIsLoading(true);

      const [favorites, recentIssues, assigned, project, projectInfo] = await Promise.all([
        getFavorites(),
        getRecentActivityIssues(),
        getAssignedIssues(),
        defaultProjectKey ? getProjectIssues(defaultProjectKey) : Promise.resolve([]),
        defaultProjectKey ? getProjectByKey(defaultProjectKey) : Promise.resolve(null),
      ]);

      setFavoriteIssues(favorites);
      setRecentActivityIssues(recentIssues);
      setAssignedIssues(assigned);
      setProjectIssues(project);
      if (projectInfo) {
        setProjectName(projectInfo.name);
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load issues" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetCache() {
    try {
      await resetCachedAccountId();
      await showToast({ style: Toast.Style.Success, title: "Cache reset", message: "Cache has been cleared" });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to reset cache" });
    }
  }

  // Load issues on mount (favorites, assigned, project, recent activity)
  useEffect(() => {
    loadIssues();
  }, [defaultProjectKey]);

  // Handle issue search with debounce
  useEffect(() => {
    async function search() {
      if (searchText.length >= 2) {
        try {
          const results = await searchIssues(searchText);
          setSearchResults(results);
        } catch (error) {
          console.error("Search failed:", error);
        }
      } else {
        setSearchResults([]);
      }
    }

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const renderIssueItem = (issue: JiraIssue, isFav: boolean = false) => (
    <List.Item
      key={issue.key}
      icon={issue.fields.issuetype.iconUrl || { source: Icon.Circle, tintColor: Color.Blue }}
      title={issue.key}
      subtitle={issue.fields.summary}
      accessories={[{ text: issue.fields.status.name }]}
      actions={
        <ActionPanel>
          <Action title="Select Issue" onAction={() => onSelect(issue.key)} />
          {!isFav && (
            <Action
              title="Add to Favorites"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => {
                await addToFavorites(issue.key, issue.fields.summary);
                await loadIssues();
                await showToast({ style: Toast.Style.Success, title: "Added to Favorites", message: issue.key });
              }}
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

  const renderFavoriteItem = (favorite: FavoriteIssue) => (
    <List.Item
      key={favorite.key}
      icon={{ source: Icon.Star, tintColor: Color.Yellow }}
      title={favorite.key}
      subtitle={favorite.summary}
      actions={
        <ActionPanel>
          <Action title="Select Issue" onAction={() => onSelect(favorite.key)} />
          <Action
            title="Remove from Favorites"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={async () => {
              await removeFromFavorites(favorite.key);
              await loadIssues();
              await showToast({ style: Toast.Style.Success, title: "Removed from Favorites", message: favorite.key });
            }}
          />
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search issues by key or title..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.length >= 2 && searchResults.length > 0 && (
        <List.Section title="Search Results">
          {searchResults.map((issue) => renderIssueItem(issue, false))}
        </List.Section>
      )}

      {searchText.length < 2 && (
        <>
          {favoriteIssues.length > 0 && (
            <List.Section title="Favorites" subtitle={`${favoriteIssues.length} issues`}>
              {favoriteIssues.map(renderFavoriteItem)}
            </List.Section>
          )}

          {recentActivityIssues.length > 0 && (
            <List.Section title="Recent Activity" subtitle={`${recentActivityIssues.length} issues`}>
              {recentActivityIssues.map((issue) => renderIssueItem(issue, false))}
            </List.Section>
          )}

          <List.Section title="Assigned to Me" subtitle={`${assignedIssues.length} issues`}>
            {assignedIssues.map((issue) => renderIssueItem(issue, false))}
          </List.Section>

          {defaultProjectKey && projectIssues.length > 0 && (
            <List.Section
              title={projectName || `${defaultProjectKey} Project`}
              subtitle={`${projectIssues.length} issues`}
            >
              {projectIssues.map((issue) => renderIssueItem(issue, false))}
            </List.Section>
          )}
        </>
      )}

      {searchText.length >= 2 && searchResults.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No issues found" description="Try a different search term" />
      )}
    </List>
  );
}

function WorklogForm({ issueKey, onSuccess }: { issueKey: string; onSuccess: () => void }) {
  const [issue, setIssue] = useState<JiraIssue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToString(new Date()));

  // Fetch details of the selected issue
  useEffect(() => {
    async function loadIssue() {
      try {
        setIsLoading(true);
        const fetchedIssue = await getIssueByKey(issueKey);
        setIssue(fetchedIssue);
      } catch (error) {
        console.error("Failed to load issue:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadIssue();
  }, [issueKey]);

  async function handleSubmit(values: Values) {
    try {
      // Validate date is provided
      if (!values.date) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Date required",
          message: "Please select a date for the worklog",
        });
        return;
      }

      // Use custom date if "custom" was selected, otherwise use dropdown value
      let dateStr = values.date;
      if (values.date === "custom") {
        if (!values.customDate) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Custom date required",
            message: "Please enter a date in YYYY-MM-DD format",
          });
          return;
        }
        // Validate custom date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(values.customDate)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid date format",
            message: "Please use YYYY-MM-DD format (e.g., 2025-11-01)",
          });
          return;
        }
        dateStr = values.customDate;
      }

      // Get current time (HH:MM:SS) for the start time
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const startTime = `${hours}:${minutes}:${seconds}`;

      // Parse the duration string (supports "1h30m", "1h30", "2h", "45m", etc.)
      const timeSpentSeconds = parseDuration(values.timeSpent);

      if (timeSpentSeconds === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid duration",
          message: "Please enter a valid duration (e.g., 1h, 1h30m, 30m)",
        });
        return;
      }

      // Check if issue was loaded successfully
      if (!issue) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add worklog",
          message: "Could not find issue",
        });
        return;
      }

      // Get the current user's account ID
      const jiraAccountId = await getCurrentUserAccountId();

      await fetchFromTempoAPI("/worklogs", {
        method: "POST",
        body: JSON.stringify({
          issueId: parseInt(issue.id),
          authorAccountId: jiraAccountId,
          timeSpentSeconds: timeSpentSeconds,
          startDate: dateStr,
          startTime,
          description: values.description || "",
        }),
      });

      // Fetch all worklogs for the selected day to calculate total
      const worklogsResponse = (await fetchFromTempoAPI(
        `/worklogs/user/${jiraAccountId}?from=${dateStr}&to=${dateStr}`,
      )) as TempoWorklogsResponse;

      const totalSeconds = worklogsResponse.results.reduce((sum, w) => sum + w.timeSpentSeconds, 0);
      const totalDuration = formatDuration(totalSeconds);
      const dayLabel = getDateLabel(dateStr);

      await showToast({
        style: Toast.Style.Success,
        title: "Worklog added",
        message: `${values.timeSpent} logged. ${dayLabel}: ${totalDuration}`,
        primaryAction: {
          title: "View Worklogs",
          onAction: async () => {
            await open("raycast://extensions/darchen_gautier/tempo/list-worklogs");
          },
        },
      });

      // Redirect back to issue selector
      onSuccess();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to add worklog" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Add worklog to ${issueKey}${issue ? `: ${issue.fields.summary}` : ""}`} />
      <Form.TextField
        id="timeSpent"
        title="Time Spent"
        placeholder="1h, 1h30m, 30m"
        defaultValue="1h"
        info="Enter duration in human format: 1h, 1h30m, 2h, 45m, etc."
      />
      <Form.Dropdown id="date" title="Date" value={selectedDate} onChange={setSelectedDate}>
        {Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = formatDateToString(date);
          const label = getDateLabel(dateStr);
          return <Form.Dropdown.Item key={dateStr} value={dateStr} title={label} />;
        })}
        <Form.Dropdown.Item key="custom" value="custom" title="Custom date..." />
      </Form.Dropdown>
      {selectedDate === "custom" && (
        <Form.TextField
          id="customDate"
          title="Custom Date"
          placeholder="YYYY-MM-DD"
          info="Enter a custom date in YYYY-MM-DD format (e.g., 2025-11-01)"
        />
      )}
      <Form.TextArea id="description" title="Description" placeholder="Optional work description" />
    </Form>
  );
}

export default function Command() {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  if (!selectedIssue) {
    return <IssueSelector onSelect={setSelectedIssue} />;
  }

  return <WorklogForm issueKey={selectedIssue} onSuccess={() => setSelectedIssue(null)} />;
}
