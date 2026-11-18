import { GitHubRelease } from "../types/biome-schema";

const githubApi = "https://api.github.com/repos/biomejs/biome/releases";

export async function fetchAllReleases(): Promise<GitHubRelease[]> {
  try {
    const response = await fetch(githubApi, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Raycast-Biome-Extension",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const releases: GitHubRelease[] = await response.json();
    return releases;
  } catch (error) {
    throw new Error(
      `Failed to fetch releases: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
