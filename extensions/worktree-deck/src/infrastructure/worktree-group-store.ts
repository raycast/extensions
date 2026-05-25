import type { Worktree, WorktreeSection } from "./worktree-types";

export function groupWorktrees(worktrees: Worktree[]): WorktreeSection[] {
  const map = new Map<string, Worktree[]>();
  for (const item of worktrees) {
    const list = map.get(item.repo);
    if (list) {
      list.push(item);
    } else {
      map.set(item.repo, [item]);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([repo, items]) => ({
      repo,
      items: items.sort((left, right) => (left.branch ?? "").localeCompare(right.branch ?? "")),
    }));
}
