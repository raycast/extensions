import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useCallback } from "react";
import fetch from "node-fetch";
import { ProblemDetail } from "./components/ProblemDetail";
import { CODEFORCES_API_BASE } from "./constants";
import { Problem } from "./interface/Problem";
import { CodeforcesResponse } from "./interface/CodeforcesResponse";
import { getColorHexCode } from "./func/HexCode";

async function searchProblems(query: string): Promise<Problem[]> {
  try {
    const response = await fetch(`${CODEFORCES_API_BASE}problemset.problems`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Received HTML instead of JSON. Please try again in a few minutes.");
    }

    const data = (await response.json()) as CodeforcesResponse;

    if (data.status === "OK") {
      const problems = data.result.problems.map((problem) => ({
        id: `${problem.contestId}${problem.index}`,
        name: problem.name,
        contestId: problem.contestId,
        index: problem.index,
        rating: problem.rating,
        tags: problem.tags,
      }));

      if (query.length < 2) {
        return problems.sort(() => Math.random() - 0.5).slice(0, 15);
      }

      return problems
        .filter((problem) => {
          const searchLower = query.toLowerCase();
          const problemId = problem.id.toLowerCase();
          const problemName = problem.name.toLowerCase();
          return problemId.includes(searchLower) || problemName.includes(searchLower);
        })
        .slice(0, 25);
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch problems",
      message: "Please try again later",
    });

    return [];
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error fetching problems",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return [];
  }
}

export default function Command() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const results = await searchProblems(query);
      setProblems(results);
    } catch (error) {
      console.error("Error during search:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error during search",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearch}
      searchBarPlaceholder="Search problems (e.g., 4A, Watermelon)"
      throttle
    >
      {problems.map((problem) => (
        <List.Item
          key={problem.id}
          icon={Icon.Document}
          title={`${problem.id}. ${problem.name}`}
          subtitle={problem.tags.join(", ")}
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
                    <ProblemDetail contestId={problem.contestId} index={problem.index} problemName={problem.name} />
                  }
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
