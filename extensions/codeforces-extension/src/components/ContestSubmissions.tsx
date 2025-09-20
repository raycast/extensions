/* eslint-disable @typescript-eslint/no-explicit-any */
import { useFetch } from "@raycast/utils";
import { Result } from "../interface/Result";
import { CODEFORCES_API_BASE, CODEFORCES_BASE } from "../constants";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getExecutionStatusColor, getExecutionStatusString } from "../func/ExecutionStatus";

export function ContestSubmissions(values: { id: any; handle: any; name: any }) {
  const results: Result[] = [];
  const { isLoading, data, error } = useFetch(
    `${CODEFORCES_API_BASE}contest.status?contestId=${values.id}&handle=${values.handle}`,
    {
      keepPreviousData: true,
    },
  );
  const [conData, setConData] = useState<Result[]>(results);

  if (error) {
    console.log(`Error while fetching details: \n ${error}`);
  }

  useEffect(() => {
    if (!isLoading) {
      setConData((data as any).result);
    }
  }, [isLoading]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${values.name} Submissions`}
      searchBarPlaceholder="Search Submissions By Problem"
    >
      {conData.reverse().map((item) => (
        <List.Item
          key={item.id}
          title={`${item.problem.index}. ${item.problem.name}`}
          actions={
            <ActionPanel title="Submissions">
              <Action.OpenInBrowser
                title="Open Submission in Browser"
                url={`${CODEFORCES_BASE}contest/${item.contestId}/submission/${item.id}`}
              />
              <Action.OpenInBrowser
                title="Open Problem in Browser"
                url={`${CODEFORCES_BASE}contest/${item.contestId}/problem/${item.problem.index}`}
              />
              <Action.CopyToClipboard
                title="Copy Problem URL"
                shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                content={`${CODEFORCES_BASE}contest/${item.contestId}/problem/${item.problem.index}`}
              />
            </ActionPanel>
          }
          accessories={[
            { text: `${item.problem.rating}`, icon: Icon.BarChart },
            { text: `${item.programmingLanguage}` },
            { date: new Date(item.creationTimeSeconds * 1000) },
            { tag: { value: getExecutionStatusString(item.verdict), color: getExecutionStatusColor(item.verdict) } },
          ]}
        />
      ))}
    </List>
  );
}
