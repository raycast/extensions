import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios from "axios";

interface Preferences {
  username: string;
  githubToken?: string;
}

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

const getUsername = (): string => {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.username;
};

export const fetchUserProfile = async (username: string): Promise<GitHubUser> => {
  const preferences = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {};

  if (preferences.githubToken) {
    headers["Authorization"] = `token ${preferences.githubToken}`;
  }

  try {
    const response = await axios.get(`https://api.github.com/users/${username}`, { headers });
    return response.data;
  } catch (error) {
    showFailureToast("Failed to fetch GitHub profile");
    throw error;
  }
};

export const fetchUserRepositories = async (): Promise<GitHubRepository[]> => {
  const username = getUsername();
  const preferences = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {};

  if (preferences.githubToken) {
    headers["Authorization"] = `token ${preferences.githubToken}`;
  }

  try {
    const response = await axios.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, {
      headers,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const rateLimitMessage = "GitHub API rate limit exceeded. ";
      const authMessage = preferences.githubToken
        ? "Please check your token's validity."
        : "Please add a GitHub personal access token in extension preferences to increase the rate limit.";

      throw new Error(rateLimitMessage + authMessage);
    }
    throw error;
  }
};

export const fetchContributionData = async (username: string): Promise<ContributionsCollection> => {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.githubToken) {
    // If no token provided, return mock data
    showFailureToast("⚠️ Showing MOCK data without token");
    return generateMockContributionData();
  }

  try {
    const query = `
      query {
        user(login: "${username}") {
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
      { query },
      {
        headers: {
          Authorization: `bearer ${preferences.githubToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    const calendarData = response.data?.data?.user?.contributionsCollection?.contributionCalendar;

    // Transform the data to match our interface
    const weeks = calendarData.weeks.map(
      (week: { contributionDays: Array<{ date: string; contributionCount: number; color: string }> }) => ({
        contributionDays: week.contributionDays.map(
          (day: { date: string; contributionCount: number; color: string }) => ({
            date: day.date,
            count: day.contributionCount,
            level: contributionLevelFromColor(day.color),
          }),
        ),
      }),
    );

    return {
      contributionCalendar: {
        totalContributions: calendarData.totalContributions,
        weeks: weeks,
      },
    };
  } catch (error) {
    console.error("Error fetching contribution data:", error);
    // do nothing, return empty data
    return { contributionCalendar: { totalContributions: 0, weeks: [] } };
  }
};

// Helper function to determine contribution level based on color
function contributionLevelFromColor(color: string): number {
  // GitHub's contribution colors from lightest to darkest
  const colors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const index = colors.indexOf(color.toLowerCase());
  return index >= 0 ? index : 0;
}

// Generate mock contribution data when token is not available
function generateMockContributionData(): ContributionsCollection {
  const today = new Date();
  const weeks = [];

  for (let w = 0; w < 52; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (7 * w + (6 - d)));

      // Generate random contribution count between 0-10
      const count = Math.floor(Math.random() * 11);
      let level = 0;
      if (count > 0) level = count > 6 ? 4 : Math.ceil(count / 2);

      days.push({
        date: date.toISOString().split("T")[0],
        count,
        level,
      });
    }
    weeks.push({ contributionDays: days });
  }

  return {
    contributionCalendar: {
      totalContributions: weeks
        .flat()
        .map((week) => week.contributionDays.reduce((sum, day) => sum + day.count, 0))
        .reduce((a, b) => a + b, 0),
      weeks: weeks,
    },
  };
}
