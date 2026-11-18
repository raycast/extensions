import { useState, useEffect, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  getPreferenceValues,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import { getWorklogs, updateWorklog, postTimeLog, deleteWorklog } from "./controllers";
import { DailyWorklog, WorklogEntry } from "./types";
import {
  parseTimeToSeconds,
  createTimeLogSuccessMessage,
  formatSecondsToTimeString,
  extractCommentText,
  getMonthBounds,
  groupWorklogsByDay,
  createJiraUrl,
} from "./utils";
import Command from "./index";

// Form to edit existing worklog
function EditWorklogForm({ entry, onSuccess }: { entry: WorklogEntry; onSuccess: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const originalDescription = extractCommentText(entry.worklog.comment);
  const [timeInput, setTimeInput] = useState(formatSecondsToTimeString(entry.worklog.timeSpentSeconds));
  const [description, setDescription] = useState(originalDescription);
  const [startedAt, setStartedAt] = useState(new Date(entry.worklog.started));

  const handleSubmit = async (values: { timeInput: string; description: string; startedAt: Date }) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const timeSpentSeconds = parseTimeToSeconds(values.timeInput);

      if (timeSpentSeconds <= 0) {
        showToast(Toast.Style.Failure, "Please enter a valid time");
        setIsLoading(false);
        return;
      }

      await updateWorklog(
        entry.issue.key,
        entry.worklog.id,
        timeSpentSeconds,
        values.description === originalDescription ? undefined : values.description,
        values.startedAt,
      );

      showToast(Toast.Style.Success, "Worklog updated successfully");
      onSuccess();
      pop();
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Failed to update worklog",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Worklog",
      message: "Are you sure you want to delete this worklog? This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deleteWorklog(entry.issue.key, entry.worklog.id);
      showToast(Toast.Style.Success, "Worklog deleted successfully");
      onSuccess();
      pop();
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Failed to delete worklog",
        error instanceof Error ? error.message : String(error),
      );
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit Worklog - ${entry.issue.key}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Worklog" onSubmit={handleSubmit} />
          <Action title="Delete Worklog" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleDelete} />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={`${entry.issue.key}: ${entry.issue.summary}`} />
      <Form.Separator />
      <Form.DatePicker id="startedAt" title="Date" value={startedAt} onChange={(date) => date && setStartedAt(date)} />
      <Form.TextField
        id="timeInput"
        title="Time (e.g., 2h 15m 30s)"
        placeholder="Enter time as 'Xh Ym Zs'"
        value={timeInput}
        onChange={setTimeInput}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Description of work completed"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}

// Form to add more time to an issue
function AddTimeToIssueForm({
  issueKey,
  issueSummary,
  initialDate,
  onSuccess,
}: {
  issueKey: string;
  issueSummary: string;
  initialDate: Date;
  onSuccess: () => void;
}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt] = useState(initialDate);

  const handleSubmit = async (values: { timeInput: string; description: string; startedAt: Date }) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const timeSpentSeconds = parseTimeToSeconds(values.timeInput);

      if (timeSpentSeconds <= 0) {
        showToast(Toast.Style.Failure, "Please enter a valid time");
        setIsLoading(false);
        return;
      }

      await postTimeLog(timeSpentSeconds, issueKey, values.description, values.startedAt);

      const successMessage = createTimeLogSuccessMessage(issueKey, timeSpentSeconds);
      showToast(Toast.Style.Success, successMessage);
      onSuccess();
      pop();
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to log time", error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Log Time - ${issueKey}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Time" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={`${issueKey}: ${issueSummary}`} />
      <Form.Separator />
      <Form.DatePicker id="startedAt" title="Date" value={startedAt} onChange={(date) => date && setStartedAt(date)} />
      <Form.TextField
        id="timeInput"
        title="Time (e.g., 2h 15m 30s)"
        placeholder="Enter time as 'Xh Ym Zs'"
        value={timeInput}
        onChange={setTimeInput}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Description of work completed"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}

export default function ViewLoggedTime() {
  // Cache only during this view's lifetime; reopening fetches external changes.
  const worklogCache = useRef(new Map<string, WorklogEntry[]>()).current;
  const preferences = getPreferenceValues<Preferences>();
  const configuredThreshold = Number(preferences.dailyHoursThreshold || "7");
  const dailyHoursThreshold = Number.isFinite(configuredThreshold) && configuredThreshold > 0 ? configuredThreshold : 7;
  const { push } = useNavigation();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dailyWorklogs, setDailyWorklogs] = useState<DailyWorklog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [loadError, setLoadError] = useState<string>();

  // Build Jira issue URL
  const getJiraIssueUrl = (issueKey: string) => {
    return createJiraUrl(`/browse/${encodeURIComponent(issueKey)}`);
  };

  // Format month for display
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
  };

  // Jump to current month
  const goToCurrentMonth = () => {
    const newMonth = new Date();
    setCurrentMonth(newMonth);
  };

  // Format time duration
  const formatDuration = formatSecondsToTimeString;

  // Get cache key for a month
  const getMonthCacheKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return JSON.stringify([preferences.domain, preferences.username, preferences.isJiraCloud, year, month]);
  };

  // Forms may move a worklog into another month, so invalidate all cached months.
  const refreshWorklogs = () => {
    worklogCache.clear();
    setRefreshTrigger((prev) => prev + 1);
  };

  // Fetch worklogs for current month with caching
  useEffect(() => {
    let isMounted = true;

    const fetchWorklogs = async () => {
      const cacheKey = getMonthCacheKey(currentMonth);

      setLoadError(undefined);
      const cachedEntries = worklogCache.get(cacheKey);
      if (cachedEntries) {
        const grouped = groupWorklogsByDay(cachedEntries, currentMonth);
        setDailyWorklogs(grouped);
        setLoading(false);
        showToast(Toast.Style.Success, `Loaded ${cachedEntries.length} worklogs (cached)`);

        return;
      }

      // Clear previous-month data while the requested month loads.
      setDailyWorklogs([]);
      setLoading(true);
      try {
        const { start, end } = getMonthBounds(currentMonth);
        const entries = await getWorklogs(start, end);

        if (isMounted) {
          // Store in cache
          worklogCache.set(cacheKey, entries);

          const grouped = groupWorklogsByDay(entries, currentMonth);
          setDailyWorklogs(grouped);
          showToast(Toast.Style.Success, `Loaded ${entries.length} worklogs`);
        }
      } catch (e) {
        if (isMounted) {
          const message = e instanceof Error ? e.message : String(e);
          setLoadError(message);
          showToast(Toast.Style.Failure, "Failed to load worklogs", message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWorklogs();

    return () => {
      isMounted = false;
    };
  }, [currentMonth, refreshTrigger]);

  // Filter worklogs based on search text
  const parseFilter = (text: string): { type: "less" | "greater" | "equal" | "text"; hours?: number } | null => {
    const trimmed = text.trim();

    // Check for <5 (less than)
    const lessThanMatch = trimmed.match(/^<(\d+(?:\.\d+)?)$/);
    if (lessThanMatch) {
      return { type: "less", hours: parseFloat(lessThanMatch[1]) };
    }

    // Check for >5 (greater than)
    const greaterThanMatch = trimmed.match(/^>(\d+(?:\.\d+)?)$/);
    if (greaterThanMatch) {
      return { type: "greater", hours: parseFloat(greaterThanMatch[1]) };
    }

    // Check for =5 or just 5 (equal to)
    const equalMatch = trimmed.match(/^=?(\d+(?:\.\d+)?)$/);
    if (equalMatch) {
      return { type: "equal", hours: parseFloat(equalMatch[1]) };
    }

    // Otherwise it's text search
    if (trimmed) {
      return { type: "text" };
    }

    return null;
  };

  const filteredWorklogs = dailyWorklogs.filter((day) => {
    const filter = parseFilter(searchText);

    if (!filter) {
      return true; // No filter, show all
    }

    const dayHours = day.totalSeconds / 3600;

    if (filter.type === "less" && filter.hours !== undefined) {
      return dayHours < filter.hours;
    }

    if (filter.type === "greater" && filter.hours !== undefined) {
      return dayHours > filter.hours;
    }

    if (filter.type === "equal" && filter.hours !== undefined) {
      // Allow some tolerance for floating point comparison
      return Math.abs(dayHours - filter.hours) < 0.01;
    }

    if (filter.type === "text") {
      // Text search - search in issue keys, summaries, and descriptions
      const searchLower = searchText.toLowerCase();
      return day.entries.some((entry) => {
        const issueKey = entry.issue.key.toLowerCase();
        const summary = entry.issue.summary.toLowerCase();
        const comment = extractCommentText(entry.worklog.comment).toLowerCase();
        return issueKey.includes(searchLower) || summary.includes(searchLower) || comment.includes(searchLower);
      });
    }

    return true;
  });

  // Calculate total for the month
  const monthTotal = dailyWorklogs.reduce((sum, day) => sum + day.totalSeconds, 0);

  return (
    <List
      isLoading={loading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search worklogs or filter by hours (e.g., <5, >7, =8)..."
      navigationTitle={`Logged Time - ${formatMonth(currentMonth)}`}
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {filteredWorklogs.length === 0 && !loading ? (
        <List.EmptyView
          title={loadError ? "Unable to Load Worklogs" : "No Worklogs Found"}
          description={
            loadError ||
            (searchText ? `No worklogs match "${searchText}"` : `No time logged in ${formatMonth(currentMonth)}`)
          }
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refreshWorklogs}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
              <Action title="Previous Month" icon={Icon.ArrowLeft} onAction={goToPreviousMonth} />
              <Action title="Next Month" icon={Icon.ArrowRight} onAction={goToNextMonth} />
              <Action title="Current Month" icon={Icon.Calendar} onAction={goToCurrentMonth} />
            </ActionPanel>
          }
        />
      ) : null}
      {filteredWorklogs.map((day) => {
        const dayLabel = day.date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        const subtitle = day.totalSeconds > 0 ? formatDuration(day.totalSeconds) : "No time logged";
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        const isFuture = dayDate > today;

        return (
          <List.Section key={day.date.toISOString()} title={dayLabel} subtitle={subtitle}>
            {day.entries.map((entry) => (
              <List.Item
                key={entry.worklog.id}
                title={entry.issue.key}
                subtitle={entry.issue.summary}
                icon={{ source: Icon.Circle, tintColor: Color.Blue }}
                keywords={[entry.issue.key, entry.issue.summary, entry.issue.project.name]}
                accessories={[
                  { text: formatDuration(entry.worklog.timeSpentSeconds), icon: Icon.Clock },
                  { text: entry.issue.project.key, icon: Icon.Box },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`## ${entry.issue.key}: ${entry.issue.summary}\n\n${extractCommentText(entry.worklog.comment) || "_No description provided_"}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Issue" text={entry.issue.key} />
                        <List.Item.Detail.Metadata.Label title="Summary" text={entry.issue.summary} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Project" text={entry.issue.project.name} />
                        <List.Item.Detail.Metadata.Label title="Project Key" text={entry.issue.project.key} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Time Spent"
                          text={formatDuration(entry.worklog.timeSpentSeconds)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Started"
                          text={new Date(entry.worklog.started).toLocaleString()}
                        />
                        <List.Item.Detail.Metadata.Label title="Logged By" text={entry.worklog.author.displayName} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Jira"
                      url={getJiraIssueUrl(entry.issue.key)}
                      icon={Icon.Globe}
                    />
                    <ActionPanel.Section title="Time Logging">
                      <Action
                        title="Edit Worklog"
                        icon={Icon.Pencil}
                        onAction={() => push(<EditWorklogForm entry={entry} onSuccess={refreshWorklogs} />)}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                      />
                      <Action
                        title="Log More Time on This Issue"
                        icon={Icon.Plus}
                        onAction={() =>
                          push(
                            <AddTimeToIssueForm
                              issueKey={entry.issue.key}
                              issueSummary={entry.issue.summary}
                              initialDate={day.date}
                              onSuccess={refreshWorklogs}
                            />,
                          )
                        }
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                      />
                      <Action.Push
                        title="Log Time on Another Task"
                        icon={Icon.PlusCircle}
                        target={<Command initialDate={day.date} onSuccess={refreshWorklogs} />}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                      />
                    </ActionPanel.Section>
                    <Action
                      title="Toggle Details"
                      icon={Icon.AppWindowSidebarLeft}
                      onAction={() => setShowingDetail(!showingDetail)}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Issue Key"
                      content={entry.issue.key}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <ActionPanel.Section title="Navigation">
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={refreshWorklogs}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                      />
                      <Action title="Previous Month" icon={Icon.ArrowLeft} onAction={goToPreviousMonth} />
                      <Action title="Next Month" icon={Icon.ArrowRight} onAction={goToNextMonth} />
                      <Action title="Current Month" icon={Icon.Calendar} onAction={goToCurrentMonth} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
            {!isFuture &&
              day.date.getDay() >= 1 &&
              day.date.getDay() <= 5 &&
              day.totalSeconds < dailyHoursThreshold * 3600 && (
                <List.Item
                  title="Log Time for This Day"
                  subtitle={`${formatDuration(day.totalSeconds)} logged - ${formatDuration(dailyHoursThreshold * 3600 - day.totalSeconds)} remaining`}
                  icon={{ source: Icon.PlusCircle, tintColor: Color.SecondaryText }}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Open Log Time"
                        icon={Icon.Plus}
                        target={<Command initialDate={day.date} onSuccess={refreshWorklogs} />}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={refreshWorklogs}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                      />
                      <Action title="Previous Month" icon={Icon.ArrowLeft} onAction={goToPreviousMonth} />
                      <Action title="Next Month" icon={Icon.ArrowRight} onAction={goToNextMonth} />
                      <Action title="Current Month" icon={Icon.Calendar} onAction={goToCurrentMonth} />
                    </ActionPanel>
                  }
                />
              )}
          </List.Section>
        );
      })}
      {!loading && !loadError && (
        <List.Section title="Summary">
          <List.Item
            title="Total for Month"
            subtitle={formatDuration(monthTotal)}
            icon={{ source: Icon.BarChart, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshWorklogs}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
                <Action title="Previous Month" icon={Icon.ArrowLeft} onAction={goToPreviousMonth} />
                <Action title="Next Month" icon={Icon.ArrowRight} onAction={goToNextMonth} />
                <Action title="Current Month" icon={Icon.Calendar} onAction={goToCurrentMonth} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
