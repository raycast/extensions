import { DateTime } from "luxon";

import type { ProjectHealth } from "../api/projects";

export const PROJECT_HEALTH_LABEL: Record<Exclude<ProjectHealth, null>, string> = {
  onTrack: "On Track",
  atRisk: "At Risk",
  offTrack: "Off Track",
};

export function formatHealth(health: ProjectHealth): string {
  if (!health) {
    return "No update";
  }

  return PROJECT_HEALTH_LABEL[health];
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }

  const date = DateTime.fromISO(iso);
  return date.isValid ? date.toFormat("MMM d, yyyy") : null;
}

export function formatRelative(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }

  const date = DateTime.fromISO(iso);
  return date.isValid ? (date.toRelative() ?? null) : null;
}

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/;

function countCells(row: string): number {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").length;
}

// Linear renders single-column tables as "callout" boxes with <br> line breaks
// inside the cell. Markdown tables can't contain newlines, so convert them to
// blockquotes; genuine multi-column tables are left untouched.
function convertCalloutTables(markdown: string): string {
  const lines = markdown.split("\n");
  const output: string[] = [];

  let index = 0;
  while (index < lines.length) {
    if (!TABLE_ROW.test(lines[index])) {
      output.push(lines[index]);
      index += 1;
      continue;
    }

    const block: string[] = [];
    while (index < lines.length && TABLE_ROW.test(lines[index])) {
      block.push(lines[index]);
      index += 1;
    }

    const firstContentRow = block.find((row) => !TABLE_SEPARATOR.test(row)) ?? block[0];
    if (countCells(firstContentRow) > 1) {
      output.push(...block);
      continue;
    }

    for (const row of block) {
      if (TABLE_SEPARATOR.test(row)) {
        continue;
      }
      const cell = row.trim().replace(/^\|/, "").replace(/\|$/, "").trim();
      for (const cellLine of cell.replace(/<br\s*\/?>/gi, "\n").split("\n")) {
        output.push(`> ${cellLine.trim()}`);
      }
    }
    output.push("");
  }

  return output.join("\n");
}

export function cleanLinearMarkdown(markdown: string): string {
  const normalized = markdown.replace(/^\s*(?:\+\+\+|>>>)\s?/gm, "").replace(/\\([[\]()])/g, "$1");

  return convertCalloutTables(normalized)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripMarkdown(markdown: string): string {
  return cleanLinearMarkdown(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
