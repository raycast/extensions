import type { Task } from "./parser";

export function bestMatch(tasks: Task[], query: string): Task | null {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return null;

  let bestScore = 0;
  let best: Task | null = null;

  for (const task of tasks) {
    const desc = task.description.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (desc.includes(t)) score++;
    }
    if (score === 0) continue;
    if (score > bestScore || (score === bestScore && best && task.lineNumber < best.lineNumber)) {
      bestScore = score;
      best = task;
    }
  }

  return best;
}

function tokensOf(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}
