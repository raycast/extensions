import { formatDistanceToNow } from "date-fns";
import { GitHubRepository } from "../api/github";
import { escapeMarkdown } from "../utils/markdown";

export function formatRepositories(repositories: GitHubRepository[]): string {
  if (!repositories.length) return "## Recently Updated Repositories\n\nNo public repositories were found.";

  const previews = repositories.slice(0, 3).map((repository) => {
    const details = [
      repository.language,
      `★ ${(repository.stargazers_count ?? 0).toLocaleString("en-US")}`,
      `${(repository.forks_count ?? 0).toLocaleString("en-US")} forks`,
      repository.updated_at
        ? `Updated ${formatDistanceToNow(new Date(repository.updated_at), { addSuffix: true })}`
        : undefined,
    ].filter((value): value is string => Boolean(value));
    const description = repository.description ? `\n\n${escapeMarkdown(repository.description)}` : "";
    return `### [${escapeMarkdown(repository.name)}](<${repository.html_url}>)${description}\n\n${details.map(escapeMarkdown).join(" · ")}`;
  });
  return `## Recently Updated Repositories\n\n${previews.join("\n\n")}\n\nYou can choose **Browse Repositories** from Actions to search all ${repositories.length} loaded repositories.`;
}
