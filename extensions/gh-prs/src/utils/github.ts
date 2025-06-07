import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type PullRequest = {
  id: number;
  title: string;
  html_url: string;
  repository_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  repository_name?: string;
  state?: string;
  draft?: boolean;
  number?: number;
  comments: number;
};

export type FetchPRsResult = {
  prs: PullRequest[];
  error: string | null;
  isLoading: boolean;
};

/**
 * Fetches Pull Requests from GitHub using the GitHub CLI
 * @param query The GitHub search query to use
 * @returns The PRs, error state, and loading state
 */
export async function fetchPRs(query: string): Promise<FetchPRsResult> {
  try {
    const { stdout, stderr } = await execAsync(`/opt/homebrew/bin/gh api -X GET search/issues -f q='${query}'`);

    if (stderr) {
      console.error("Error fetching PRs:", stderr);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch PRs",
        message: "Check if GitHub CLI is installed and you're authenticated",
      });
      return {
        prs: [],
        error: "Failed to fetch PRs. Make sure GitHub CLI is installed and authenticated.",
        isLoading: false,
      };
    }

    const response = JSON.parse(stdout);
    const pullRequests = response.items || [];

    // Extract repository name from repository_url for each PR
    const processedPRs = pullRequests.map((pr: PullRequest) => {
      const repoUrl = pr.repository_url;
      const repoName = repoUrl ? repoUrl.split("/").slice(-2).join("/") : "Unknown";
      return { ...pr, repository_name: repoName };
    });

    processedPRs.sort((a: PullRequest, b: PullRequest) => {
      if (a.draft && !b.draft) return 1;
      if (!a.draft && b.draft) return -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return {
      prs: processedPRs,
      error: null,
      isLoading: false,
    };
  } catch (err) {
    console.error("Error:", err);
    showToast({
      style: Toast.Style.Failure,
      title: "Error fetching PRs",
      message: "An unexpected error occurred",
    });
    return {
      prs: [],
      error: "An error occurred while fetching PRs",
      isLoading: false,
    };
  }
}

/**
 * Fetches PRs awaiting the user's review
 */
export async function fetchPRsAwaitingReview(): Promise<FetchPRsResult> {
  return fetchPRs("is:open user-review-requested:@me");
}

/**
 * Fetches the user's PRs
 */
export async function fetchMyPRs(): Promise<FetchPRsResult> {
  return fetchPRs("is:open author:@me");
}
