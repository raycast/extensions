import { GitHubRepository } from "../api/github";

export function formatRepositories(repositories: GitHubRepository[]): string {
  if (!repositories || repositories.length === 0) {
    return "## Top Repositories\n\nNo repositories found.";
  }

  const repoList = repositories
    .map((repo) => {
      const updatedDate = new Date(repo.updated_at).toLocaleDateString();
      return `
### [${repo.name}](${repo.html_url})

${repo.description || "No description provided"}

⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count} | ${repo.language || "No language specified"} | Updated: ${updatedDate}
`;
    })
    .join("\n");

  return `## Top Repositories\n\n${repoList}`;
}
