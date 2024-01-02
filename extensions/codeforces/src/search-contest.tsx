/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

const CODEFORCES_API_BASE = "https://codeforces.com/api/";
const CODEFORCES_BASE = "https://codeforces.com/";

export default function Command() {
  const { isLoading, data, error } = useFetch(`${CODEFORCES_API_BASE}contest.list?gym=false`);

  if (error) {
    console.log(`Error while fetching details:\n${error}`);
  }

  interface Contest {
    id?: number;
    name?: string;
    type?: string;
    phase?: string;
    frozen?: boolean;
    durationSeconds?: number;
    startTimeSeconds?: number;
    relativeTimeSeconds?: number;
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

  function getStatusColor(status) {
    switch (status) {
      case "BEFORE":
        return Color.Blue;
      case "CODING":
        return Color.Magenta;
      case "PENDING_SYSTEM_TEST":
        return Color.Yellow;
      case "SYSTEM_TEST":
        return Color.Orange;
      case "FINISHED":
        return Color.Green;
    }
  }

  function getTypeColor(type) {
    switch (type) {
      case "CF":
        return Color.Green;
      case "IOI":
        return Color.Magenta;
      case "ICPC":
        return Color.Yellow;
    }
  }

  function getStatusString(status) {
    switch (status) {
      case "BEFORE":
        return "Not Started Yet";
      case "CODING":
        return "In Progress";
      case "PENDING_SYSTEM_TEST":
        return "Pending System Test";
      case "SYSTEM_TEST":
        return "In System Test";
      case "FINISHED":
        return "Finished";
      default:
        return "Unknown Status";
    }
  }

  function secondsToDurationString(seconds) {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];

    if (days > 0) {
      parts.push(`${days}D`);
    }

    if (hours > 0) {
      parts.push(`${hours}H`);
    }

    if (minutes > 0) {
      parts.push(`${minutes}M`);
    }

    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0 || parts.length === 0) {
      parts.push(`${remainingSeconds}S`);
    }

    return parts.join(" ");
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Contests"
      searchBarPlaceholder="Search"
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
              <Action.OpenInBrowser url={`${CODEFORCES_BASE}contest/${contest.id}`} />
              <Action.CopyToClipboard
                title="Copy Pull Request URL"
                content={`${CODEFORCES_BASE}contest/${contest.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
