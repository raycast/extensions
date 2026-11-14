import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  location?: string;
  blog?: string;
  company?: string;
  twitter_username?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

export interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

export interface ContributionsCollection {
  contributionCalendar: {
    totalContributions: number;
    weeks: Array<{
      contributionDays: ContributionDay[];
    }>;
  };
}

const REQUEST_TIMEOUT_MS = 15_000;

function requestOptions() {
  const { githubToken } = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {};
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  return {
    headers,
    timeout: REQUEST_TIMEOUT_MS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

function requestError(error: unknown): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error("GitHub could not load this section.");
  }
  if (["ECONNABORTED", "ETIMEDOUT", "ERR_CANCELED"].includes(error.code ?? "")) {
    return new Error("GitHub did not respond within 15 seconds. Press ⌘R to retry.");
  }
  if (error.response?.status === 401) {
    return new Error("GitHub rejected your token. Replace it in the extension preferences and press ⌘R to retry.");
  }
  if (error.response?.status === 403 || error.response?.status === 429) {
    return new Error("GitHub denied this request. Check your token permissions and API rate limits, then retry.");
  }
  if (error.response?.status === 404) {
    return new Error("GitHub could not find this user. Check the username in the extension preferences.");
  }
  return new Error("GitHub could not load this section. Check your connection and press ⌘R to retry.");
}

export const fetchUserProfile = async (username: string): Promise<GitHubUser> => {
  try {
    const response = await axios.get<GitHubUser>(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      requestOptions(),
    );
    return response.data;
  } catch (error) {
    throw requestError(error);
  }
};

export const fetchUserRepositories = async (username: string): Promise<GitHubRepository[]> => {
  try {
    const response = await axios.get<GitHubRepository[]>(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=10`,
      requestOptions(),
    );
    return response.data;
  } catch (error) {
    throw requestError(error);
  }
};

export const fetchContributionData = async (username: string): Promise<ContributionsCollection> => {
  if (!getPreferenceValues<Preferences>().githubToken) {
    throw new Error(
      "A GitHub token is required to load the contribution calendar. Add it in the extension preferences.",
    );
  }

  try {
    const query = `
      query UserContributions($username: String!) {
        user(login: $username) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  color
                }
              }
            }
          }
        }
      }
    `;

    const response = await axios.post(
      "https://api.github.com/graphql",
      { query, variables: { username } },
      requestOptions(),
    );
    if (response.data?.errors?.length) {
      throw new Error("GitHub could not load the contribution calendar. Check your token permissions and retry.");
    }
    const calendarData = response.data?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendarData || !Array.isArray(calendarData.weeks)) {
      throw new Error("GitHub returned no contribution calendar for this user.");
    }

    const weeks = calendarData.weeks.map(
      (week: { contributionDays: Array<{ date: string; contributionCount: number; color: string }> }) => ({
        contributionDays: week.contributionDays.map((day) => ({
          date: day.date,
          count: day.contributionCount,
          level: contributionLevelFromColor(day.color),
        })),
      }),
    );

    return { contributionCalendar: { totalContributions: calendarData.totalContributions, weeks } };
  } catch (error) {
    throw requestError(error);
  }
};

function contributionLevelFromColor(color: string): number {
  const colors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const index = colors.indexOf(color.toLowerCase());
  return index >= 0 ? index : 0;
}
