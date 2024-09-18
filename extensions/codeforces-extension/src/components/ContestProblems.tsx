/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, Color, List } from "@raycast/api";
import { CODEFORCES_API_BASE, CODEFORCES_BASE } from "../constants";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

export function ContestProblems(value: { name_value: any; id: any }) {
  const id = value.id;
  const name_value = value.name_value;
  const { isLoading, data, error } = useFetch(`${CODEFORCES_API_BASE}contest.standings?contestId=${id}&count=1`, {
    keepPreviousData: true,
    keepalive: true,
  });
  if (error) {
    console.log(`Error while fetching details:\n${error}`);
  }

  interface Problem {
    contestId: number;
    index: string;
    name: string;
    type: string;
    points: number;
    rating: number;
    tags: string[];
  }

  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredList, filterList] = useState(problems);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!isLoading) {
      setProblems((data as any).result.problems);
      filterList((data as any).result.problems);
    }
  }, [isLoading]);

  useEffect(() => {
    filterList(problems.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase())));
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={`${name_value} Problems`}
      searchBarPlaceholder="Search By Name"
    >
      {filteredList.map((problem) => (
        <List.Item
          key={problem.index}
          title={`${problem.index}. ${problem.name}`}
          accessories={[{ tag: { value: `${problem.rating}`, color: Color.PrimaryText } }]}
          actions={
            <ActionPanel title="Contests Problems">
              <Action.OpenInBrowser url={`${CODEFORCES_BASE}contest/${problem.contestId}/problem/${problem.index}`} />
              <Action.CopyToClipboard
                title="Copy Problem URL"
                content={`${CODEFORCES_BASE}contest/${problem.contestId}/${problem.index}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
