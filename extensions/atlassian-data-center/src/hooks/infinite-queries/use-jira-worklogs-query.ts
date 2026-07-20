import { useQuery, skipToken } from "@tanstack/react-query";
import dayjs from "dayjs";

import { getJiraWorklogs, getIssueTypeIcon, getJiraIssueUrl, formatSecondsToWorkedTime } from "@/utils";
import { WORKING_HOURS_PER_DAY } from "@/constants";
import type {
  JiraWorklogsResponse,
  WorklogGroup,
  HookQueryOptions,
  JiraWorklog,
  ListItemAccessories,
  ProcessedWorklog,
} from "@/types";

export function useJiraWorklogsQuery(
  { userKey, from, to }: { userKey: string | undefined; from: string; to: string },
  queryOptions?: HookQueryOptions<
    JiraWorklogsResponse,
    WorklogGroup[],
    readonly [{ scope: "jira"; entity: "worklogs"; userKey: string | undefined; from: string; to: string }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "worklogs", userKey, from, to }],
    queryFn: !userKey
      ? skipToken
      : async ({ queryKey }) => {
          const [{ userKey, from, to }] = queryKey;
          return await getJiraWorklogs({ worker: [userKey!], from, to });
        },
    select: (data) => processList(data),
    staleTime: Infinity,
    gcTime: Infinity,
    ...queryOptions,
  });
}

function processList(worklogs: JiraWorklogsResponse): WorklogGroup[] {
  // Sort all worklogs by started time first
  const sortedWorklogs = worklogs.sort((a, b) => dayjs(a.started).valueOf() - dayjs(b.started).valueOf());

  // Group by date and process in one pass
  const groupedByDate = sortedWorklogs.reduce(
    (groups, worklog) => {
      const date = dayjs(worklog.started).format("YYYY-MM-DD");
      if (!groups[date]) {
        groups[date] = {
          date,
          totalTimeSpentSeconds: 0,
          items: [],
        };
      }

      groups[date].totalTimeSpentSeconds += worklog.timeSpentSeconds;
      groups[date].items.push(processItem(worklog));

      return groups;
    },
    {} as Record<string, { date: string; totalTimeSpentSeconds: number; items: ProcessedWorklog[] }>,
  );

  // Convert to final format and sort by date descending
  return Object.values(groupedByDate)
    .map((group) => ({
      date: group.date,
      totalTimeSpent: formatSecondsToWorkedTime(group.totalTimeSpentSeconds),
      totalTimeSpentSeconds: group.totalTimeSpentSeconds,
      items: group.items,
      title: dayjs(group.date).format("D/MMM/YYYY"),
      subtitle: `${formatSecondsToWorkedTime(group.totalTimeSpentSeconds)} of ${WORKING_HOURS_PER_DAY}h`,
    }))
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
}

function processItem(worklog: JiraWorklog): ProcessedWorklog {
  const { issue, timeSpent, timeSpentSeconds, comment, started } = worklog;

  const renderKey = `${worklog.tempoWorklogId}`;
  const issueTypeIcon = getIssueTypeIcon(issue.issueType) || "icon-unknown.svg";

  const url = getJiraIssueUrl(issue.key);
  const startedDayjs = dayjs(started);
  const date = startedDayjs.format("YYYY-MM-DD");

  const keywords = [
    issue.key, // issue key
    ...issue.key.split("-"), // project key and issue number
    startedDayjs.format("D"), // day of month
    startedDayjs.format("ddd"), // day of week
  ];

  const accessories: ListItemAccessories = [
    {
      tag: timeSpent,
      tooltip: `Σ Logged: ${timeSpent}\nComment:\n${comment || "No comment"}`,
    },
  ];

  return {
    renderKey,
    keywords,
    issueKey: issue.key,
    title: issue.summary,
    subtitle: issue.key,
    icon: issueTypeIcon,
    accessories,
    url,
    timeSpent,
    timeSpentSeconds,
    comment,
    date,
    worklogId: worklog.originId,
  };
}
