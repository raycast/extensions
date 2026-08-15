import { Image } from "@raycast/api";

export enum GitLabIcons {
  merge_request = "mropen.png",
  todo = "todo-done.svg",
  review = "review-list.svg",
  issue = "exclamation.png",
  project = "project.svg",
  merged = "merged.png",
  mropen = "mropen.png", // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
  mraccepted = "todo.png",
  branches = "merged.png", // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
  ci = "rocket.png",
  milestone = "board_circuit.png",
  explorer = "list.png",
  settings = "gear.png",
  security = "lock.png",
  labels = "dash.png",
  epic = "epic.svg",
  comment = "book.png",
  wiki = "list.png", // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
  show_details = "app-window-sidebar-right-16",
  tag = "tag.png",
  commit = "commit.svg",
  rebase = "arrow-rebase.png",
  activity = "history.svg",
  status_success = "status_success.png",
  status_failed = "status_failed.png",
  status_running = "status_running.png",
  status_notfound = "status_notfound.png",
  status_pending = "status_pending.png",
  status_created = "status_created.png",
  status_canceled = "status_canceled.png",
  status_skipped = "status_skipped.png",
  status_scheduled = "status_scheduled.png",
}

export function getSVGText(text: string): string | undefined {
  if (!text) {
    return undefined;
  }
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#FA6E34" rx="10"></rect>
  <text
  font-size="22"
  fill="white"
  font-family="Verdana"
  text-anchor="middle"
  alignment-baseline="baseline"
  x="20.5"
  y="32.5">${text}</text>
</svg>
  `.replaceAll("\n", "");

  return `data:image/svg+xml,${svg}`;
}

export function getTextIcon(text: string): Image.ImageLike | undefined {
  if (!text) {
    return undefined;
  }
  return getSVGText(text);
}
