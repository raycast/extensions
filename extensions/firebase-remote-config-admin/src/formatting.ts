import type {
  PreparedBulkResult,
  ProjectConfig,
  ProjectGroup,
  PublishedBulkResult,
} from "./types";

export function csvToList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function listToCsv(values: string[]): string {
  return values.join(", ");
}

export function summarizeProjects(projects: ProjectConfig[]): string {
  if (projects.length === 0) return "No projects";
  if (projects.length === 1) return projects[0].displayName;
  return `${projects.length} projects`;
}

export function summarizeGroups(groups: ProjectGroup[]): string {
  if (groups.length === 0) return "No groups";
  return `${groups.length} groups`;
}

export function buildPreparedOperationMarkdown(
  results: PreparedBulkResult[],
): string {
  const lines = ["# Preview", ""];
  const previewCount = results.filter(
    (result) => result.status === "preview",
  ).length;
  const noOpCount = results.filter(
    (result) => result.status === "no-op",
  ).length;
  const errorCount = results.filter(
    (result) => result.status === "error",
  ).length;
  lines.push(`- Ready to publish: ${previewCount}`);
  lines.push(`- No-op: ${noOpCount}`);
  lines.push(`- Errors: ${errorCount}`);
  lines.push("");

  for (const result of results) {
    lines.push(`## ${result.project.displayName}`);
    if (result.status === "error") {
      lines.push(`- Error: ${result.error}`);
    } else if (result.status === "no-op") {
      lines.push("- No change");
    } else {
      for (const change of result.changes) {
        lines.push(`- ${change}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function buildPublishedOperationMarkdown(
  results: PublishedBulkResult[],
): string {
  const lines = ["# Publish Result", ""];
  for (const result of results) {
    lines.push(`## ${result.project.displayName}`);
    lines.push(`- Status: ${result.status}`);
    if (result.error) {
      lines.push(`- Error: ${result.error}`);
    }
    for (const change of result.changes) {
      lines.push(`- ${change}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
