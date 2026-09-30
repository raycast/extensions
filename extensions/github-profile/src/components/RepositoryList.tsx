import { GitHubRepository } from "../api/github";

export function formatRepositories(repositories: GitHubRepository[]): string {
  if (!repositories || repositories.length === 0) {
    return "## Top Repositories\n\nNo repositories found.";
  }

  // Calculate how many columns we want (e.g., 3 columns)
  const columns = 3;
  const tableHeader =
    "| " +
    Array(columns).fill("Repository").join(" | ") +
    " |\n" +
    "| " +
    Array(columns).fill("---").join(" | ") +
    " |";

  // Create rows with 3 repositories per row
  let tableRows = "";
  for (let i = 0; i < repositories.length; i += columns) {
    const rowCells = [];
    for (let j = 0; j < columns; j++) {
      const repo = repositories[i + j];
      if (repo) {
        rowCells.push(`[${repo.name}](${repo.html_url})`);
      } else {
        rowCells.push(""); // Empty cell if no more repositories
      }
    }
    tableRows += "| " + rowCells.join(" | ") + " |\n";
  }

  return `## Top Repositories\n\n${tableHeader}\n${tableRows}`;
}
