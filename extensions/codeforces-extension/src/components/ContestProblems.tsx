import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useState, useMemo } from "react";
import { CODEFORCES_BASE } from "../constants";
import { useCodeforces } from "../func/useCodeforces";
import type { ContestStandings, Problem } from "../types/codeforces";

/**
 * Displays problems for a contest.
 *
 * Props:
 * - `name_value`: contest name shown in navigation/title
 * - `id`: contest id (string or number)
 */
export function ContestProblems({ name_value, id }: { name_value: string; id: string | number }) {
  // Fetch contest standings (we request `count=1` to only retrieve the problems block)
  const { isLoading, result } = useCodeforces<ContestStandings>("contest.standings", {
    contestId: id,
    count: 1,
  });

  const problems: Problem[] = result?.problems ?? [];

  const [searchText, setSearchText] = useState<string>("");

  const filtered = useMemo(() => {
    const q = (searchText ?? "").toLowerCase().trim();
    if (!q) return problems;
    return problems.filter((p) => (p.name ?? "").toLowerCase().includes(q));
  }, [problems, searchText]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={`${name_value} Problems`}
      searchBarPlaceholder="Search By Name"
    >
      {filtered.map((problem) => {
        const contestId = problem.contestId ?? id;
        const ratingTag = problem.rating ? `${problem.rating}` : "Unrated";

        return (
          <List.Item
            key={`${contestId}:${problem.index}`}
            title={`${problem.index}. ${problem.name}`}
            accessories={[{ tag: { value: ratingTag, color: Color.PrimaryText } }]}
            actions={
              <ActionPanel title="Contests Problems">
                <Action.OpenInBrowser url={`${CODEFORCES_BASE}contest/${contestId}/problem/${problem.index}`} />
                <Action.CopyToClipboard
                  title="Copy Problem URL"
                  content={`${CODEFORCES_BASE}contest/${contestId}/${problem.index}`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
