import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useState, useMemo, useCallback } from "react";
import { useCodeforces } from "./func/useCodeforces";
import type { Problem, Problemset } from "./types/codeforces";
import { getColorHexCode } from "./func/HexCode";

const PAGE_SIZE = 50;

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [page, setPage] = useState(0);

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

    // 3. Sort by difficulty (rating), with unrated problems at the end
    list = [...list].sort((a, b) => {
      const ratingA = a.rating ?? Infinity;
      const ratingB = b.rating ?? Infinity;
      return ratingA - ratingB;
    });

    return list;
  }, [problems, query, difficulty]);

  const itemsToRender = useMemo(() => {
    return filtered.slice(0, (page + 1) * PAGE_SIZE);
  }, [filtered, page]);

  const hasMore = filtered.length > itemsToRender.length;

  const onLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  function onSearchTextChange(text: string) {
    setQuery(text);
    setPage(0); // Reset to first page on new search
  }

  function onDifficultyChange(value: string) {
    setDifficulty(value);
    setPage(0); // Reset to first page on filter change
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
    <List.Dropdown tooltip="Filter by Difficulty" onChange={onDifficultyChange} storeValue>
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
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Search problems (e.g., 4A, Watermelon)"
      searchBarAccessory={searchBarAccessory}
      pagination={{
        onLoadMore,
        hasMore,
        pageSize: PAGE_SIZE,
      }}
      throttle
    >
      {itemsToRender.map((problem) => {
        const id = `${problem.contestId ?? ""}${problem.index}`;

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
                  <Action.OpenInBrowser
                    title="Open on Codeforces"
                    url={`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
