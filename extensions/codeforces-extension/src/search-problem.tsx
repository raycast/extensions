import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useState, useMemo } from "react";
import { ProblemDetail } from "./components/ProblemDetail";
import { useCodeforces } from "./func/useCodeforces";
import type { Problem, Problemset } from "./types/codeforces";
import { getColorHexCode } from "./func/HexCode";

export default function Command() {
  const [query, setQuery] = useState<string>("");

  // Fetch the full problemset (typed). The hook handles query building and typing.
  const { isLoading, result } = useCodeforces<Problemset>("problemset.problems");

  const problems = result?.problems ?? [];

  const filtered = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();

    if (!q || q.length < 2) {
      // discovery mode: randomize and show a small slice
      return problems
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 15);
    }

    return problems
      .filter((p: Problem) => {
        const problemId = `${p.contestId ?? ""}${p.index}`.toLowerCase();
        const problemName = (p.name ?? "").toLowerCase();
        return problemId.includes(q) || problemName.includes(q);
      })
      .slice(0, 25);
  }, [problems, query]);

  async function onSearchChange(text: string) {
    setQuery(text);
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder="Search problems (e.g., 4A, Watermelon)"
      throttle
    >
      {filtered.map((problem) => {
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
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
