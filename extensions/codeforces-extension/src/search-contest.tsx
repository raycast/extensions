/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getStatusColor, getStatusString, getTypeColor, secondsToDurationString } from "./func/ContestExecutionStatus";
import { CODEFORCES_API_BASE, CODEFORCES_BASE } from "./constants";
import { ContestProblems } from "./components/ContestProblems";

export default function Command() {
  const { isLoading, data, error } = useFetch(`${CODEFORCES_API_BASE}contest.list?gym=false`, {
    keepPreviousData: true,
  });

  if (error) {
    console.log(`Error while fetching details:\n${error}`);
  }

  interface Contest {
    id: number;
    name: string;
    type: string;
    phase: string;
    frozen: boolean;
    durationSeconds: number;
    startTimeSeconds: number;
    relativeTimeSeconds: number;
  }

  const emptyContest = {
    id: 0,
    name: "",
    type: "",
    phase: "",
    frozen: false,
    durationSeconds: 0,
    startTimeSeconds: 0,
    relativeTimeSeconds: 0,
  };

  const [contests, setContests] = useState<Contest[]>([emptyContest]);
  const [filteredList, filterList] = useState(contests);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!isLoading) {
      setContests((data as any).result);
      filterList((data as any).result);
    }
  }, [isLoading]);

  useEffect(() => {
    filterList(contests.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase())));
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Contests"
      searchBarPlaceholder="Search By Name"
    >
      {filteredList.slice(0, 49).map((contest) => (
        <List.Item
          key={contest.id}
          title={`${contest.name.slice(0, 40)}${contest.name.length > 40 ? "..." : ""}`}
          accessories={[
            { tag: { value: getStatusString(contest.phase), color: getStatusColor(contest.phase) } },
            { tag: { value: `${contest.type}`, color: getTypeColor(contest.type) } },
            {
              text: `${new Date(contest.startTimeSeconds * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })} ${new Date(contest.startTimeSeconds * 1000).toLocaleDateString([], {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}`,
            },
            { tag: secondsToDurationString(contest.durationSeconds) },
          ]}
          actions={
            <ActionPanel title="Codeforces Contests">
              {contest.phase !== "BEFORE" ? (
                <Action.Push
                  icon={Icon.AppWindowList}
                  target={<ContestProblems value={contest.id} />}
                  title="View Problems"
                />
              ) : (
                <></>
              )}
              <Action.OpenInBrowser url={`${CODEFORCES_BASE}contest/${contest.id}`} />
              <Action.CopyToClipboard
                title="Copy Contest URL"
                shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                content={`${CODEFORCES_BASE}contest/${contest.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
