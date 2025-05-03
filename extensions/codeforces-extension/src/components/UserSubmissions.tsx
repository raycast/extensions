/* eslint-disable @typescript-eslint/no-explicit-any */
import { useFetch } from "@raycast/utils";
import { Result } from "../interface/Result";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getExecutionStatusColor, getExecutionStatusString } from "../func/ExecutionStatus";
import { CODEFORCES_API_BASE, CODEFORCES_BASE } from "../constants";

export function UserSubmissions(value: { name: any; comp: any }) {
  const results: Result[] = [];
  const userHandle = value.name;
  const han = value.comp;
  const { isLoading, data, error } = useFetch(`${CODEFORCES_API_BASE}user.${han}?handle=${userHandle}`, {
    keepPreviousData: true,
  });

  if (error) {
    console.log(`Error while fetching details: \n ${error}`);
  }

  const [subData, setsubData] = useState<Result[]>(results);
  const [filteredList, filterList] = useState(subData);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!isLoading) {
      setsubData((data as any).result);
      filterList((data as any).result);
    }
  }, [isLoading]);

  useEffect(() => {
    filterList(subData.filter((item) => item.problem.name.toLowerCase().includes(searchText.toLowerCase())));
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${userHandle}'s Submissions`}
      searchBarPlaceholder={`Search ${userHandle}'s Submissions`}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {filteredList.slice(0, 49).map((item) => (
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
