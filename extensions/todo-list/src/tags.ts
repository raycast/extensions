import type { TodoSections } from "./types";

export function getTags(sections: TodoSections): string[] {
  return [
    ...new Set(
      [...sections.pinned, ...sections.todo, ...sections.completed].flatMap((item) => (item.tag ? [item.tag] : [])),
    ),
  ].sort((a, b) => a.localeCompare(b));
}
