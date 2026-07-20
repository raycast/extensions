import path from "node:path";

export function navigationTitle(actionName: string, repo?: string): string {
  if (!repo) {
    return actionName;
  }
  try {
    const dir = path.parse(repo);
    return `${actionName} | ${dir.name}`;
  } catch {
    return actionName;
  }
}
