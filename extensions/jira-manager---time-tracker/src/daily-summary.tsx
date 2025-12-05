import { List, showToast, Toast, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { searchIssues, getIssueWorklogs, getMyself } from "./utils/jira";

interface DailyWorklog {
  issueKey: string;
  summary: string;
  timeSpentSeconds: number;
}

export default function Command() {
  const [dailyLogs, setDailyLogs] = useState<DailyWorklog[]>([]);
  const { data: currentUser } = usePromise(getMyself);
  const [isLoading, setLoading] = useState(true);

  useMemo(() => {
    fetchDailyLogs();
  }, [currentUser]);

  async function fetchDailyLogs() {
    if (!currentUser) return;
    try {
      const jql = `worklogAuthor = currentUser() AND worklogDate >= startOfDay()`;
      const issues = await searchIssues(jql);

      const now = new Date();

      const logs: DailyWorklog[] = [];

      for (const issue of issues) {
        const worklogs = await getIssueWorklogs(issue.key);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const myLogsToday = worklogs.filter((w: any) => {
          const isMe = w.author.accountId === currentUser.accountId;
          const logDate = new Date(w.started);
          const isToday =
            logDate.getDate() === now.getDate() &&
            logDate.getMonth() === now.getMonth() &&
            logDate.getFullYear() === now.getFullYear();

          return isMe && isToday;
        });

        if (myLogsToday.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalSeconds = myLogsToday.reduce((acc: number, curr: any) => acc + curr.timeSpentSeconds, 0);
          logs.push({
            issueKey: issue.key,
            summary: issue.fields.summary,
            timeSpentSeconds: totalSeconds,
          });
        }
      }
      setDailyLogs(logs);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to fetch summary", message: String(error) });
    } finally {
      setLoading(false);
    }
  }

  const totalTimeSeconds = dailyLogs.reduce((acc, log) => acc + log.timeSpentSeconds, 0);
  const totalHours = Math.floor(totalTimeSeconds / 3600);
  const totalMinutes = Math.floor((totalTimeSeconds % 3600) / 60);

  // Calculate percentage of 8h day
  // const progress = Math.min(1, totalTimeSeconds / (8 * 3600));

  return (
    <List isLoading={isLoading} navigationTitle="Daily Work Summary">
      <List.Section title={`Total Today: ${totalHours}h ${totalMinutes}m`}>
        {dailyLogs.map((log) => (
          <List.Item
            key={log.issueKey}
            title={log.issueKey}
            subtitle={log.summary}
            accessories={[
              {
                text: `${Math.floor(log.timeSpentSeconds / 3600)}h ${Math.floor((log.timeSpentSeconds % 3600) / 60)}m`,
              },
            ]}
            icon={Icon.Clock}
          />
        ))}
        {dailyLogs.length === 0 && !isLoading && <List.Item title="No work logged today" icon={Icon.XMarkCircle} />}
      </List.Section>
    </List>
  );
}
