import { useCodeforces } from "../func/useCodeforces";
import { CODEFORCES_BASE } from "../constants";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getExecutionStatusColor, getExecutionStatusString } from "../func/ExecutionStatus";
import type { Submission } from "../types/codeforces";

/**
 * Displays submissions for a contest/handle
 *
 * Props:
 * - values.id: contest id
 * - values.handle: user handle
 * - values.name: display name for navigation title
 */
export function ContestSubmissions(values: { id: number | string; handle: string; name: string }) {
  const contestId = values.id;
  const handle = values.handle;
  const displayName = values.name;

  const { isLoading, result: conData } = useCodeforces<Submission[]>("contest.status", {
    contestId,
    handle,
  });

  const submissions: Submission[] = conData ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${displayName} Submissions`}
      searchBarPlaceholder="Search Submissions By Problem"
    >
      {submissions
        .slice()
        .reverse()
        .map((item) => (
          <List.Item
            key={item.id}
            title={`${item.problem.index}. ${item.problem.name}`}
            actions={
              <ActionPanel title="Submissions">
                <Action.OpenInBrowser
                  title="Open Submission in Browser"
                  url={`${CODEFORCES_BASE}contest/${item.contestId ?? contestId}/submission/${item.id}`}
                />
                <Action.OpenInBrowser
                  title="Open Problem in Browser"
                  url={`${CODEFORCES_BASE}contest/${item.contestId ?? contestId}/problem/${item.problem.index}`}
                />
                <Action.CopyToClipboard
                  title="Copy Problem URL"
                  shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                  content={`${CODEFORCES_BASE}contest/${item.contestId ?? contestId}/problem/${item.problem.index}`}
                />
              </ActionPanel>
            }
            accessories={[
              { text: `${item.problem?.rating ?? "Unrated"}`, icon: Icon.BarChart },
              { text: `${item.programmingLanguage ?? ""}` },
              { date: new Date(((item.creationTimeSeconds ?? 0) as number) * 1000) },
              {
                tag: {
                  value: getExecutionStatusString(item.verdict),
                  color: getExecutionStatusColor(item.verdict),
                },
              },
            ]}
          />
        ))}
    </List>
  );
}
