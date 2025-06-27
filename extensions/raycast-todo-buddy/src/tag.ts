import { Task, Tag } from "./types";

export function findTags(task: Task, allTags: Tag[]) {
  const tags: Tag[] = task.tags
    .map((tagId) => {
      return allTags.find((tag) => tag.id === tagId);
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter(Boolean) as any;
  return tags;
}
