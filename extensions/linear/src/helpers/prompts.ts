import { IssuePromptRelative, IssuePromptResult } from "../api/getIssues";

/**
 * Mirrors Linear's "Copy as prompt" action. Linear renders the identifier, branch name, title,
 * description, team, labels, project and the issue's immediate hierarchy - state, priority,
 * assignee and milestone are deliberately left out, and tags for empty values are omitted
 * rather than emitted blank.
 */
export function getIssuePrompt(issue: IssuePromptResult) {
  const lines = [`Work on Linear issue ${issue.identifier}:`, ""];

  const branchName = getSuggestedBranchName(issue.branchName);
  if (branchName) {
    lines.push(`Suggested branch name: ${branchName}`, "");
  }

  lines.push(`<issue identifier="${escapeAttribute(issue.identifier)}">`);
  lines.push(`<title>${issue.title}</title>`);
  lines.push(...getDescriptionLines(issue.description));

  if (issue.team?.name) {
    lines.push(`<team name="${escapeAttribute(issue.team.name)}"/>`);
  }

  issue.labels?.nodes?.forEach((label) => {
    lines.push(`<label>${label.name}</label>`);
  });

  if (issue.project?.name) {
    const name = escapeAttribute(issue.project.name);
    lines.push(
      issue.project.description
        ? `<project name="${name}">${issue.project.description}</project>`
        : `<project name="${name}"/>`,
    );
  }

  if (issue.parent) {
    lines.push(...getRelativeLines("parent-issue", issue.parent));
  }

  const children = issue.children?.nodes ?? [];
  if (children.length > 0) {
    lines.push("<sub-issues>");
    children.forEach((child) => lines.push(...getRelativeLines("sub-issue", child)));
    lines.push("</sub-issues>");
  }

  lines.push("</issue>");

  return lines.join("\n");
}

/** The parent and each sub-issue are rendered as a trimmed-down issue carrying its UUID. */
function getRelativeLines(tag: "parent-issue" | "sub-issue", issue: IssuePromptRelative) {
  return [
    `<${tag} identifier="${escapeAttribute(issue.identifier)}">`,
    `<id>${issue.id}</id>`,
    `<title>${issue.title}</title>`,
    ...getDescriptionLines(issue.description),
    `</${tag}>`,
  ];
}

/** Single-line descriptions sit inline, multi-line ones get their own opening and closing lines. */
function getDescriptionLines(description?: string | null) {
  if (!description) {
    return [];
  }

  return description.includes("\n")
    ? ["<description>", description, "</description>"]
    : [`<description>${description}</description>`];
}

/**
 * Teams can prefix branch names with the assignee's username (e.g. `samuelkraft/glaze-834-…`),
 * but the prompt only carries the issue part of the branch.
 */
function getSuggestedBranchName(branchName?: string) {
  if (!branchName) {
    return branchName;
  }

  return branchName.slice(branchName.lastIndexOf("/") + 1);
}

function escapeAttribute(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
