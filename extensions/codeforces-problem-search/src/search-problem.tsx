import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";
import { ProblemDetail } from "./ProblemDetail";

interface Problem {
  id: string;
  name: string;
  contestId: number;
  index: string;
  rating?: number;
  tags: string[];
}

interface CodeforcesResponse {
  status: string;
  result: {
    problems: CodeforcesAPIProblem[];
  };
}

interface CodeforcesAPIProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
}

interface ColorScheme {
  background: string;
  text: string;
}

function getRatingColors(rating: number | undefined): ColorScheme {
  if (!rating) return { background: "#F0F0F0", text: "#808080" };
  if (rating >= 2900) return { background: "#FFE5E5", text: "#FF0000" };
  if (rating >= 2600) return { background: "#FFE5E5", text: "#FF0000" };
  if (rating >= 2400) return { background: "#FFE5E5", text: "#FF0000" };
  if (rating >= 2300) return { background: "#FFE8D7", text: "#FF8C00" };
  if (rating >= 2200) return { background: "#FFE8D7", text: "#FF8C00" };
  if (rating >= 1900) return { background: "#F8E6F8", text: "#AA01AA" };
  if (rating >= 1600) return { background: "#E6E6FF", text: "#0000FF" };
  if (rating >= 1400) return { background: "#E6FAF9", text: "#05A89F" };
  if (rating >= 1200) return { background: "#E6FFE6", text: "#008001" };
  return { background: "#F0F0F0", text: "#808080" };
}

async function searchProblems(query: string): Promise<Problem[]> {
  if (query.length < 2) return [];

  try {
    const response = await fetch("https://codeforces.com/api/problemset.problems", {
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
      const problems = data.result.problems.map((problem: CodeforcesAPIProblem) => ({
        id: `${problem.contestId}${problem.index}`,
        name: problem.name,
        contestId: problem.contestId,
        index: problem.index,
        rating: problem.rating,
        tags: problem.tags,
      }));

      return problems
        .filter((problem: Problem) => {
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
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    const results = await searchProblems(query);
    setProblems(results);
    setIsLoading(false);
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearch}
      searchBarPlaceholder="Search problems (e.g., 4A, Watermelon)"
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
                color: getRatingColors(problem.rating).text,
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
