import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useCallback } from "react";
import fetch from "node-fetch";
import { CODEFORCES_API_BASE, CODEFORCES_BASE } from "./constants";
import { Problem } from "./interface/Problem";
import { CodeforcesResponse } from "./interface/CodeforcesResponse";
import { getColorHexCode } from "./func/HexCode";

async function searchProblems(query: string, ratingFilter: string = "all"): Promise<Problem[]> {
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

      // Filter by rating
      let filteredProblems = problems;
      if (ratingFilter !== "all") {
        filteredProblems = problems.filter((problem) => {
          if (ratingFilter === "unrated") {
            return !problem.rating;
          }

          if (!problem.rating) {
            return false;
          }

          const rating = problem.rating;
          switch (ratingFilter) {
            case "800-1200":
              return rating >= 800 && rating <= 1200;
            case "1200-1600":
              return rating >= 1200 && rating <= 1600;
            case "1600-2000":
              return rating >= 1600 && rating <= 2000;
            case "2000-2400":
              return rating >= 2000 && rating <= 2400;
            case "2400+":
              return rating >= 2400;
            default:
              return true;
          }
        });
      }

      if (query.length < 2) {
        return filteredProblems.sort(() => Math.random() - 0.5).slice(0, 15);
      }

      return filteredProblems
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
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  const handleSearch = useCallback(
    async (query: string) => {
      setIsLoading(true);
      try {
        const results = await searchProblems(query, ratingFilter);
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
    },
    [ratingFilter],
  );

  const handleRatingFilterChange = useCallback(async (newRatingFilter: string) => {
    setRatingFilter(newRatingFilter);
    setIsLoading(true);
    try {
      const results = await searchProblems("", newRatingFilter);
      setProblems(results);
    } catch (error) {
      console.error("Error during filter:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error filtering problems",
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
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Difficulty Rating" value={ratingFilter} onChange={handleRatingFilterChange}>
          <List.Dropdown.Item title="All Ratings" value="all" />
          <List.Dropdown.Item title="800-1200" value="800-1200" />
          <List.Dropdown.Item title="1200-1600" value="1200-1600" />
          <List.Dropdown.Item title="1600-2000" value="1600-2000" />
          <List.Dropdown.Item title="2000-2400" value="2000-2400" />
          <List.Dropdown.Item title="2400+" value="2400+" />
          <List.Dropdown.Item title="Unrated" value="unrated" />
        </List.Dropdown>
      }
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
                <Action.OpenInBrowser
                  title="Open in Browser"
                  icon={Icon.Globe}
                  url={`${CODEFORCES_BASE}problemset/problem/${problem.contestId}/${problem.index}`}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  icon={Icon.Link}
                  content={`${CODEFORCES_BASE}problemset/problem/${problem.contestId}/${problem.index}`}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
