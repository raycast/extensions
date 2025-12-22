import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useState, useMemo } from "react";
import { ProblemDetail } from "./components/ProblemDetail";
import { useCodeforces } from "./func/useCodeforces";
import type { Problem, Problemset } from "./types/codeforces";
import { getColorHexCode } from "./func/HexCode";

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [itemsToShow, setItemsToShow] = useState(50);
  const pageSize = 50;

  // Fetch the full problemset (typed). The hook handles query building and typing.
  const { isLoading, result } = useCodeforces<Problemset>("problemset.problems");

  const problems = result?.problems ?? [];

  const filtered = useMemo(() => {
    const textQuery = (query ?? "").trim().toLowerCase();
    let list = problems;

    // 1. Filter by difficulty
    if (difficulty !== "all") {
      const parts = difficulty.split("-");
      const min = Number(parts[0]);
      const max = parts.length > 1 ? Number(parts[1]) : Infinity;

      list = list.filter((p) => {
        const rating = p.rating ?? 0;
        return rating >= min && rating < max;
      });
    }

    // 2. Filter by text query
    if (textQuery.length >= 2) {
      list = list.filter((p: Problem) => {
        const problemId = `${p.contestId ?? ""}${p.index}`.toLowerCase();
        const problemName = (p.name ?? "").toLowerCase();
        return problemId.includes(textQuery) || problemName.includes(textQuery);
      });
    }

    return list;
  }, [problems, query, difficulty]);

  const itemsToRender = useMemo(() => {
    return filtered.slice(0, itemsToShow);
  }, [filtered, itemsToShow]);

  async function onSearchChange(text: string) {
    setQuery(text);
    setItemsToShow(pageSize); // Reset visible items on new search
  }

  const ratings = [
    "0-800",
    "800-1000",
    "1000-1200",
    "1200-1400",
    "1400-1600",
    "1600-1900",
    "1900-2100",
    "2100-2400",
    "2400-2600",
    "2600-3000",
    "3000-3500",
    "3500+",
  ];

  const searchBarAccessory = (
    <List.Dropdown
      tooltip="Filter by Difficulty"
      onChange={(value) => {
        setDifficulty(value);
        setItemsToShow(pageSize); // Reset visible items on filter change
      }}
      storeValue
    >
      <List.Dropdown.Item title="All Ratings" value="all" />
      {ratings.map((r) => {
        const [min, max] = r.split("-");
        const title = max ? `${min} - ${max}` : `${min}+`;
        return <List.Dropdown.Item key={r} title={title} value={r} />;
      })}
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading && problems.length === 0}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder="Search problems (e.g., 4A, Watermelon)"
      searchBarAccessory={searchBarAccessory}
      throttle
    >
      {itemsToRender.map((problem, index) => {
        const id = `${problem.contestId ?? ""}${problem.index}`;
        const isLastItem = index === itemsToRender.length - 1;
        const hasMore = filtered.length > itemsToRender.length;

        return (
          <List.Item
            key={id}
            icon={Icon.Document}
            title={`${id}. ${problem.name}`}
            subtitle={(problem.tags || []).join(", ")}
            accessories={[
              {
                tag: {
                  value: problem.rating ? `${problem.rating}` : "Unrated",
                  color: problem.rating ? getColorHexCode(problem.rating) : "#CCCCCC",
                },
                tooltip: `Difficulty: ${problem.rating || "Unrated"}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Problem"
                    icon={Icon.Eye}
                    target={
                      <ProblemDetail
                        contestId={problem.contestId ?? 0}
                        index={problem.index}
                        problemName={problem.name}
                      />
                    }
                  />
                  <Action.OpenInBrowser
                    title="Open on Codeforces"
                    url={`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`}
                  />
                </ActionPanel.Section>
                {isLastItem && hasMore && (
                  <ActionPanel.Section>
                    <Action
                      title="Load More Problems"
                      icon={Icon.Plus}
                      onAction={() => setItemsToShow((current) => current + pageSize)}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
