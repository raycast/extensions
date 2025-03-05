import { GitHubRepository } from "../api/github";

export function formatRepositories(repositories: GitHubRepository[]): string {
  if (!repositories || repositories.length === 0) {
    return "## Top Repositories\n\nNo repositories found.";
  }

  const tableHeader = "| Repository | Description | Stats | Updated |\n| --- | --- | --- | --- |";

  const tableRows = repositories
    .map((repo) => {
      const updatedDate = new Date(repo.updated_at).toLocaleDateString();
      const stats = `⭐ ${repo.stargazers_count} • 🍴 ${repo.forks_count} • ${repo.language || "N/A"}`;
      return `| [${repo.name}](${repo.html_url}) | ${repo.description || "No description"} | ${stats} | ${updatedDate} |`;
    })
    .join("\n");

  return `## Top Repositories\n\n${tableHeader}\n${tableRows}`;
}
