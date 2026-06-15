import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { getStatusColor, getStatusString, getTypeColor, secondsToDurationString } from "./func/ContestExecutionStatus";
import { CODEFORCES_BASE } from "./constants";
import { ContestProblems } from "./components/ContestProblems";
import { Contest } from "./types/codeforces";
import { useCodeforces } from "./func/useCodeforces";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");

  const { isLoading, result: contests } = useCodeforces<Contest[]>("contest.list", { gym: false });

  const filteredList = useMemo(() => {
    const q = (searchText ?? "").toLowerCase().trim();
    if (!q) return contests ?? [];
    return (contests ?? []).filter((item) => item.name.toLowerCase().includes(q));
  }, [searchText, contests]);

  function unixTimestampToISOString(unixTimestamp: number | string | Date) {
    const date = new Date(unixTimestamp as number);
    const formattedDate = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    return formattedDate;
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Contests"
      searchBarPlaceholder="Search By Name or Number"
    >
      {(filteredList ?? []).slice(0, 49).map((contest) => {
        const startMs = (contest.startTimeSeconds ?? 0) * 1000;
        return (
          <List.Item
            key={contest.id}
            title={`${contest.name.slice(0, 40)}${contest.name.length > 40 ? "..." : ""}`}
            accessories={[
              { tag: { value: getStatusString(contest.phase), color: getStatusColor(contest.phase) } },
              { tag: { value: `${contest.type}`, color: getTypeColor(contest.type) } },
              {
                text: `${new Date(startMs).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })} ${new Date(startMs).toLocaleDateString([], {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}`,
              },
              { tag: secondsToDurationString(contest.durationSeconds ?? 0) },
            ]}
            actions={
              <ActionPanel title="Codeforces Contests">
                {contest.phase !== "BEFORE" ? (
                  <Action.Push
                    icon={Icon.AppWindowList}
                    target={<ContestProblems id={`${contest.id}`} name_value={contest.name} />}
                    title="View Problems"
                  />
                ) : (
                  <Action.OpenInBrowser
                    icon={Icon.AppWindowList}
                    title="Add to Calendar"
                    url={`https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(
                      contest.name,
                    )}&dates=${unixTimestampToISOString(startMs)}/${unixTimestampToISOString(
                      ((contest.startTimeSeconds ?? 0) + (contest.durationSeconds ?? 0)) * 1000,
                    )}`}
                  />
                )}
                <Action.OpenInBrowser
                  url={`${CODEFORCES_BASE}${contest.phase === "BEFORE" ? "contests" : `contest/${contest.id}`}`}
                />
                <Action.CopyToClipboard
                  title="Copy Contest URL"
                  shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                  content={`${CODEFORCES_BASE}contest/${contest.id}`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
