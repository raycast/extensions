import { List, Detail, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { getIssueWorklogs, searchIssues, getMyself } from "./utils/jira";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getWeekDates(weeksAgo: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0

  const monday = new Date(now);
  monday.setDate(now.getDate() - diff - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

function WeeklyReportDetail({ weeksAgo }: { weeksAgo: number }) {
  const { start, end } = getWeekDates(weeksAgo);
  const [markdown, setMarkdown] = useState<string>("Loading...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: currentUser } = usePromise(getMyself);

  useEffect(() => {
    async function loadReport() {
      if (!currentUser) return;

      try {
        setIsLoading(true);

        const startStr = start.toISOString().split("T")[0];
        const endStr = end.toISOString().split("T")[0];

        // Get all issues where user logged work in the date range
        const jql = `worklogAuthor = currentUser() AND worklogDate >= "${startStr}" AND worklogDate <= "${endStr}" ORDER BY updated DESC`;
        const issues = await searchIssues(jql);

        if (!issues || issues.length === 0) {
          const weekLabel = weeksAgo === 0 ? "This Week" : `${weeksAgo} Week${weeksAgo > 1 ? "s" : ""} Ago`;
          setMarkdown(
            `# No Work Logged\n\nNo work was logged during ${weekLabel} (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`,
          );
          setIsLoading(false);
          return;
        }

        const projectStats: {
          [key: string]: {
            name: string;
            seconds: number;
            issues: { [key: string]: { summary: string; seconds: number } };
          };
        } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dayStats: { [key: string]: { seconds: number; entries: any[] } } = {};
        let totalSeconds = 0;
        let totalEntries = 0;

        for (const issue of issues) {
          const worklogs = await getIssueWorklogs(issue.key);

          for (const worklog of worklogs) {
            const worklogDate = new Date(worklog.started);

            if (worklog.author?.accountId === currentUser.accountId && worklogDate >= start && worklogDate <= end) {
              totalSeconds += worklog.timeSpentSeconds;
              totalEntries++;

              // Update project stats
              const projectKey = issue.fields.project.key;
              const projectName = issue.fields.project.name;

              if (!projectStats[projectKey]) {
                projectStats[projectKey] = { name: projectName, seconds: 0, issues: {} };
              }

              projectStats[projectKey].seconds += worklog.timeSpentSeconds;

              if (!projectStats[projectKey].issues[issue.key]) {
                projectStats[projectKey].issues[issue.key] = { summary: issue.fields.summary, seconds: 0 };
              }
              projectStats[projectKey].issues[issue.key].seconds += worklog.timeSpentSeconds;

              // Update day stats
              const dateKey = worklogDate.toISOString().split("T")[0];
              if (!dayStats[dateKey]) {
                dayStats[dateKey] = { seconds: 0, entries: [] };
              }

              dayStats[dateKey].seconds += worklog.timeSpentSeconds;
              dayStats[dateKey].entries.push({
                issueKey: issue.key,
                summary: issue.fields.summary,
                timeSpentSeconds: worklog.timeSpentSeconds,
                started: worklogDate,
                comment: worklog.comment,
              });
            }
          }
        }

        // Build markdown
        const weekLabel = weeksAgo === 0 ? "This Week" : `${weeksAgo} Week${weeksAgo > 1 ? "s" : ""} Ago`;

        let md = `# Weekly Report - ${weekLabel}\n\n`;
        md += `**Period**: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}\n\n`;
        md += `**Total Time Logged**: ${formatTime(totalSeconds)}\n\n`;
        md += `---\n\n`;

        // Project breakdown
        md += `## Time by Project\n\n`;
        const sortedProjects = Object.entries(projectStats).sort((a, b) => b[1].seconds - a[1].seconds);

        for (const [projectKey, projectData] of sortedProjects) {
          md += `### ${projectData.name} (${projectKey}) - ${formatTime(projectData.seconds)}\n\n`;

          const sortedIssues = Object.entries(projectData.issues).sort((a, b) => b[1].seconds - a[1].seconds);

          for (const [issueKey, issueData] of sortedIssues) {
            md += `- **${issueKey}**: ${issueData.summary} - ${formatTime(issueData.seconds)}\n`;
          }
          md += `\n`;
        }

        md += `---\n\n`;

        // Daily breakdown
        md += `## Daily Breakdown\n\n`;
        const sortedDays = Object.entries(dayStats).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [dateKey, dayData] of sortedDays) {
          const dayDate = new Date(dateKey);
          const dayName = dayDate.toLocaleDateString("en-US", { weekday: "long" });
          md += `### ${dayName}, ${dayDate.toLocaleDateString()} - ${formatTime(dayData.seconds)}\n\n`;

          const sortedEntries = dayData.entries.sort((a, b) => a.started.getTime() - b.started.getTime());

          for (const entry of sortedEntries) {
            const time = entry.started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            md += `- **${time}** - ${entry.issueKey}: ${formatTime(entry.timeSpentSeconds)}`;
            if (entry.comment) {
              md += ` - _${entry.comment}_`;
            }
            md += `\n`;
          }
          md += `\n`;
        }

        setMarkdown(md);
        setMetadata({
          period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
          totalTime: formatTime(totalSeconds),
          projects: Object.keys(projectStats).length,
          issues: issues.length,
          entries: totalEntries,
        });
        setIsLoading(false);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load report", message: String(error) });
        setMarkdown(`# Error\n\nFailed to load report: ${error}`);
        setIsLoading(false);
      }
    }

    loadReport();
  }, [currentUser, weeksAgo]);

  const weekLabel = weeksAgo === 0 ? "This Week" : `${weeksAgo} Week${weeksAgo > 1 ? "s" : ""} Ago`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Weekly Report - ${weekLabel}`}
      metadata={
        metadata && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Period" text={metadata.period} />
            <Detail.Metadata.Label title="Total Time" text={metadata.totalTime} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Projects" text={metadata.projects.toString()} />
            <Detail.Metadata.Label title="Issues" text={metadata.issues.toString()} />
            <Detail.Metadata.Label title="Work Entries" text={metadata.entries.toString()} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={markdown} title="Copy Report" />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [selectedWeek, setSelectedWeek] = useState("0");

  const weeks = [
    { value: "0", label: "This Week" },
    { value: "1", label: "Last Week" },
    { value: "2", label: "2 Weeks Ago" },
    { value: "3", label: "3 Weeks Ago" },
    { value: "4", label: "4 Weeks Ago" },
  ];

  return (
    <List
      navigationTitle="Weekly Report"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Week" onChange={setSelectedWeek} value={selectedWeek} storeValue>
          {weeks.map((week) => (
            <List.Dropdown.Item key={week.value} title={week.label} value={week.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Item
        title="View Report"
        icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
        accessories={[{ text: weeks.find((w) => w.value === selectedWeek)?.label }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Weekly Report"
              icon={Icon.Eye}
              target={<WeeklyReportDetail weeksAgo={parseInt(selectedWeek)} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
