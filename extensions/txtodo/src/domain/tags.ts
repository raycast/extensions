import type { Task } from "./parser";

export type TagKind = "project" | "context";
export type TagFilter = { kind: TagKind; name: string };

export function tagFilterKey(filter: TagFilter): string {
  return `${filter.kind}:${filter.name}`;
}

export function matchesFilters(task: Task, filters: TagFilter[]): boolean {
  for (const f of filters) {
    const haystack = f.kind === "project" ? task.projects : task.contexts;
    if (!haystack.includes(f.name)) return false;
  }
  return true;
}

const PARTIAL_RE = /(?:^|\s)([+@])([^\s+@]*)$/;

export function currentPartialTag(text: string): { kind: TagKind; partial: string } | null {
  const m = text.match(PARTIAL_RE);
  if (!m) return null;
  const kind: TagKind = m[1] === "+" ? "project" : "context";
  return { kind, partial: m[2] };
}

export function matchingTags(partial: string, tags: string[]): string[] {
  if (partial.length === 0) return [...tags];
  const lower = partial.toLowerCase();
  return tags.filter((t) => t.toLowerCase().startsWith(lower));
}
