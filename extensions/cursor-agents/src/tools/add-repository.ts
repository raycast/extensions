import { Cache } from "@raycast/api";
import type { Repository } from "../launch-agent";

type Input = {
  /**
   * The GitHub repository URL to add, e.g. https://github.com/raycast/extensions
   *
   * @example "https://github.com/raycast/extensions"
   */
  url: string;
};

/**
 * Adds a new repository to the user's configured repositories list.
 * The repository can then be used with the launch-agent tool.
 */
export default async function tool(input: Input): Promise<string> {
  if (!input.url) {
    return "Error: Repository URL is required";
  }

  if (!input.url.startsWith("https://github.com/")) {
    return "Error: Must be a GitHub repository URL starting with https://github.com/";
  }

  const urlParts = input.url.replace("https://github.com/", "").split("/");
  if (urlParts.length < 2 || !urlParts[0] || !urlParts[1]) {
    return "Error: Invalid GitHub repository URL format. Expected: https://github.com/owner/repo";
  }

  const cache = new Cache();

  const existingData = cache.get("repositories");
  const existingRepositories: Repository[] = existingData ? JSON.parse(existingData) : [];

  const repoName = input.url.replace("https://github.com/", "");
  const existingRepo = existingRepositories.find((repo) => repo.url === input.url || repo.name === repoName);

  if (existingRepo) {
    return `Repository "${repoName}" is already configured`;
  }

  const newRepository: Repository = {
    id: Date.now().toString(),
    name: repoName,
    url: input.url,
  };

  const updatedRepositories = [...existingRepositories, newRepository];

  cache.set("repositories", JSON.stringify(updatedRepositories));

  return `Successfully added repository "${repoName}" to your configured repositories`;
}
