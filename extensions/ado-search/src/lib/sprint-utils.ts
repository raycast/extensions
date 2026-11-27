import { Icon } from "@raycast/api";
import TurndownService from "turndown";
import { SprintItem } from "./sprint-types";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });

export function htmlToMarkdown(html?: string): string {
  if (!html || !html.trim()) return "";
  try {
    return turndown.turndown(html);
  } catch {
    return html.replace(/<[^>]+>/g, "");
  }
}

/** Plain text version of Azure DevOps HTML (descriptions and comments). */
export function htmlToText(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Backlog item types of the standard processes, used until the team's backlog settings are loaded. */
export const STORY_TYPES = ["User Story", "Product Backlog Item", "Feature", "Epic", "Requirement"];

/** Backlog item types from the team's backlog settings (e.g. "Issue" in the Basic process). */
let backlogTypes: string[] | undefined;
export function setBacklogTypes(types: string[]) {
  backlogTypes = types;
}

export const isStory = (type: string) => (backlogTypes ?? STORY_TYPES).includes(type);

/** Same state colors Azure DevOps uses in the web UI (Agile, Scrum and Basic processes). */
const STATE_COLORS: Record<string, string> = {
  New: "#B2B2B2",
  "To Do": "#B2B2B2",
  Proposed: "#B2B2B2",
  Active: "#007ACC",
  "In Progress": "#007ACC",
  Doing: "#007ACC",
  Committed: "#007ACC",
  Approved: "#007ACC",
  Resolved: "#FF9D00",
  Closed: "#339933",
  Done: "#339933",
  Removed: "#B2B2B2",
  "Code Review": "#8A63D2",
  "QA Review": "#E0A800",
  Released: "#1F8A70",
  Blocked: "#E5484D",
};

/** Colors configured in the Azure DevOps process, loaded from the API (override the defaults above). */
const apiColors: Record<string, string> = {};
export function setStateColors(colors: Record<string, string>) {
  Object.assign(apiColors, colors);
}

export const stateColor = (state: string): string => apiColors[state] ?? STATE_COLORS[state] ?? "#B2B2B2";

export function stateIcon(state: string): { source: Icon; tintColor: string } {
  return { source: Icon.CircleFilled, tintColor: stateColor(state) };
}

export const fmtHours = (h?: number) => (h === undefined || h === null ? "–" : `${Math.round(h * 100) / 100}h`);

export interface Group {
  key: string;
  story?: SprintItem;
  title: string;
  tasks: SprintItem[];
}

/** Groups items by parent story. Stories come first with their tasks under them. */
export function groupByStory(items: SprintItem[], all: Map<number, SprintItem>): Group[] {
  const groups = new Map<number, Group>();
  const orphans: SprintItem[] = [];
  const ensure = (story: SprintItem) => {
    let g = groups.get(story.id);
    if (!g) {
      g = { key: String(story.id), story, title: story.title, tasks: [] };
      groups.set(story.id, g);
    }
    return g;
  };
  for (const it of items) if (isStory(it.type)) ensure(it);
  for (const it of items) {
    if (isStory(it.type)) continue;
    const parent = it.sprintParentId ? all.get(it.sprintParentId) : undefined;
    if (parent) ensure(parent).tasks.push(it);
    else orphans.push(it);
  }
  const byOrder = (a?: SprintItem, b?: SprintItem) => (a?.order ?? Infinity) - (b?.order ?? Infinity);
  for (const g of groups.values()) g.tasks.sort(byOrder);
  orphans.sort(byOrder);
  const result = [...groups.values()].sort((a, b) => byOrder(a.story, b.story));
  // Like the web sprint backlog: unparented items come first, then each story followed by its tasks.
  if (orphans.length) result.unshift({ key: "none", title: "No parent", tasks: orphans });
  return result;
}

export function matches(it: SprintItem, q: string): boolean {
  const t = q.trim().toLowerCase().replace(/^#/, "");
  if (!t) return true;
  return String(it.id).includes(t) || it.title.toLowerCase().includes(t);
}
