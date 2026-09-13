export interface TaskQuery {
  scope: "snapshot" | "inbox";
  status: "open" | "completed" | "all";
  projectIds?: readonly string[];
}
