import { useCodeforces } from "../func/useCodeforces";
import { useState, useMemo } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getExecutionStatusColor, getExecutionStatusString } from "../func/ExecutionStatus";
import { CODEFORCES_BASE } from "../constants";
import type { Submission } from "../types/codeforces";

export function UserSubmissions(value: { name: string; comp: string }) {
  const userHandle = value.name;
  const han = value.comp;

  // Use typed hook to fetch submissions for the user (user.status or user.rating etc)
  const { isLoading, result: subData } = useCodeforces<Submission[]>(`user.${han}`, { handle: userHandle });

  const submissions: Submission[] = subData ?? [];
  const [searchText, setSearchText] = useState<string>("");

  const filteredList = useMemo(() => {
    const q = (searchText ?? "").toLowerCase().trim();
    if (!q) return submissions;
    return submissions.filter((item) => (item.problem?.name ?? "").toLowerCase().includes(q));
  }, [submissions, searchText]);

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
          title={`${item.problem?.index ?? ""}. ${item.problem?.name ?? ""}`}
          actions={
            <ActionPanel title="Submissions">
              <Action.OpenInBrowser
                title="Open Submission in Browser"
                url={`${CODEFORCES_BASE}contest/${item.contestId ?? 0}/submission/${item.id}`}
              />
              <Action.OpenInBrowser
                title="Open Problem in Browser"
                url={`${CODEFORCES_BASE}contest/${item.contestId ?? 0}/problem/${item.problem?.index ?? ""}`}
              />
              <Action.CopyToClipboard
                title="Copy Problem URL"
                shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                content={`${CODEFORCES_BASE}contest/${item.contestId ?? 0}/problem/${item.problem?.index ?? ""}`}
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
