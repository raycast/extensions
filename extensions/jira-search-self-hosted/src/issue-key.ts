const ISSUE_NUMBER_PATTERN = /^\d+$/;
const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]+$/i;

export function buildIssueNumberJql(query: string, defaultIncludeProjects?: string): string | undefined {
  const issueNumber = query.trim();
  if (!ISSUE_NUMBER_PATTERN.test(issueNumber)) return undefined;

  const projectKeys = [
    ...new Set(
      (defaultIncludeProjects ?? "")
        .split(",")
        .map((project) => project.trim())
        .filter((project) => PROJECT_KEY_PATTERN.test(project))
        .map((project) => project.toUpperCase()),
    ),
  ];

  if (projectKeys.length === 0) return undefined;

  const issueKeys = projectKeys.map((projectKey) => `${projectKey}-${issueNumber}`);
  if (issueKeys.length === 1) return `key=${issueKeys[0]}`;

  return `key IN (${issueKeys.map((issueKey) => `"${issueKey}"`).join(", ")})`;
}
