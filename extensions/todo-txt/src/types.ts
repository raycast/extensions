export interface TodoItem {
  /** Runtime-only unique identifier (UUID) */
  id: string;
  /** Original raw line from the file */
  raw: string;
  /** Whether the task is completed (starts with "x ") */
  completed: boolean;
  /** Completion date in YYYY-MM-DD format (only present when completed) */
  completionDate?: string;
  /** Priority A–Z */
  priority?: string;
  /** Creation date in YYYY-MM-DD format */
  creationDate?: string;
  /** Task description with projects/contexts/tags stripped out */
  text: string;
  /** Full description including projects, contexts, and tags */
  description: string;
  /** +Project tags extracted from description */
  projects: string[];
  /** @context tags extracted from description */
  contexts: string[];
  /** key:value special tags (e.g. due:2024-01-20, rec:1w, t:2024-01-15) */
  tags: Record<string, string>;
  /** Line number in the file (1-based) */
  lineNumber: number;
}

export type SortOrder =
  | "priority"
  | "creation-date-desc"
  | "creation-date-asc"
  | "due-date"
  | "alpha";

export type GroupBy = "priority" | "project" | "context" | "none";

/** Priority values A–Z, plus None */
export const PRIORITIES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

/** Color associated with each priority level for visual display */
export const PRIORITY_COLORS: Record<string, string> = {
  A: "#FF6B6B",
  B: "#FF9F43",
  C: "#FECA57",
  D: "#48DBFB",
  E: "#54A0FF",
  F: "#5F27CD",
};

/** Get a display color for a priority, falling back to a neutral color */
export function getPriorityColor(priority: string | undefined): string {
  if (!priority) return "#8395A7";
  return PRIORITY_COLORS[priority] ?? "#A29BFE";
}
