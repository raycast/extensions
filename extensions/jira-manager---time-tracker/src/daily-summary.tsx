import { List, showToast, Toast, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { searchIssues, getIssueWorklogs, getMyself } from "./utils/jira";

interface TimelineWorklog {
  issueKey: string;
  summary: string;
  timeSpentSeconds: number;
  started: Date;
  comment?: string;
}

export default function Command() {
  const [timelineLogs, setTimelineLogs] = useState<TimelineWorklog[]>([]);
  const { data: currentUser } = usePromise(getMyself);
  const [isLoading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("today");

  useEffect(() => {
    fetchDailyLogs();
  }, [currentUser, selectedDate]);

  function getTargetDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (selectedDate) {
      case "today":
        return today;
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
      }
      case "2days": {
        const twoDays = new Date(today);
        twoDays.setDate(twoDays.getDate() - 2);
        return twoDays;
      }
      case "3days": {
        const threeDays = new Date(today);
        threeDays.setDate(threeDays.getDate() - 3);
        return threeDays;
      }
      case "4days": {
        const fourDays = new Date(today);
        fourDays.setDate(fourDays.getDate() - 4);
        return fourDays;
      }
      case "5days": {
        const fiveDays = new Date(today);
        fiveDays.setDate(fiveDays.getDate() - 5);
        return fiveDays;
      }
      case "6days": {
        const sixDays = new Date(today);
        sixDays.setDate(sixDays.getDate() - 6);
        return sixDays;
      }
      default:
        return today;
    }
  }

  function getJQLDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async function fetchDailyLogs() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const targetDate = getTargetDate();
      const jqlDate = getJQLDate(targetDate);
      const jql = `worklogAuthor = currentUser() AND worklogDate = "${jqlDate}"`;
      const issues = await searchIssues(jql);

      const allLogs: TimelineWorklog[] = [];

      for (const issue of issues) {
        const worklogs = await getIssueWorklogs(issue.key);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const myLogsForDate = worklogs.filter((w: any) => {
          const isMe = w.author.accountId === currentUser.accountId;
          const logDate = new Date(w.started);
          const isSameDate =
            logDate.getDate() === targetDate.getDate() &&
            logDate.getMonth() === targetDate.getMonth() &&
            logDate.getFullYear() === targetDate.getFullYear();

          return isMe && isSameDate;
        });

        // Add each worklog individually to the timeline
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        myLogsForDate.forEach((w: any) => {
          allLogs.push({
            issueKey: issue.key,
            summary: issue.fields.summary,
            timeSpentSeconds: w.timeSpentSeconds,
            started: new Date(w.started),
            comment: w.comment?.content?.[0]?.content?.[0]?.text || undefined,
          });
        });
      }

      // Sort by time (oldest first)
      allLogs.sort((a, b) => a.started.getTime() - b.started.getTime());
      setTimelineLogs(allLogs);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to fetch summary", message: String(error) });
    } finally {
      setLoading(false);
    }
  }

  const totalTimeSeconds = timelineLogs.reduce((acc, log) => acc + log.timeSpentSeconds, 0);
  const totalHours = Math.floor(totalTimeSeconds / 3600);
  const totalMinutes = Math.floor((totalTimeSeconds % 3600) / 60);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === today.getTime()) {
      return "Today";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (targetDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const targetDate = getTargetDate();
  const dateLabel = formatDateLabel(targetDate);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Daily Work Timeline"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Date" value={selectedDate} onChange={setSelectedDate}>
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="Yesterday" value="yesterday" />
          <List.Dropdown.Item title="2 days ago" value="2days" />
          <List.Dropdown.Item title="3 days ago" value="3days" />
          <List.Dropdown.Item title="4 days ago" value="4days" />
          <List.Dropdown.Item title="5 days ago" value="5days" />
          <List.Dropdown.Item title="6 days ago" value="6days" />
        </List.Dropdown>
      }
    >
      <List.Section title={`${dateLabel} - Total: ${totalHours}h ${totalMinutes}m`}>
        {timelineLogs.map((log, index) => {
          const timeStr = formatTime(log.started);
          const durationStr = formatDuration(log.timeSpentSeconds);

          return (
            <List.Item
              key={`${log.issueKey}-${log.started.getTime()}-${index}`}
              title={`${timeStr} • ${log.issueKey}`}
              subtitle={log.comment || log.summary}
              accessories={[
                {
                  text: durationStr,
                  icon: { source: Icon.Clock, tintColor: Color.Blue },
                },
              ]}
              icon={{ source: Icon.Circle, tintColor: Color.Green }}
            />
          );
        })}
        {timelineLogs.length === 0 && !isLoading && (
          <List.Item title={`No work logged on ${dateLabel.toLowerCase()}`} icon={Icon.XMarkCircle} />
        )}
      </List.Section>
    </List>
  );
}
