import { WorkflowRun } from "../types";

export const SCREENSHOT_RUNS: WorkflowRun[] = [
  {
    id: 2,
    name: "Build visionOS binaries",
    status: "in_progress",
    conclusion: null,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    html_url: "https://github.com/raycast/extensions/actions/runs/2",
    repository: "raycast/spatial",
  },
  {
    id: 3,
    name: "Clone Marc",
    status: "completed",
    conclusion: "failure",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    html_url: "https://github.com/raycast/extensions/actions/runs/3",
    repository: "raycast/experiments",
  },
  {
    id: 4,
    name: "CI",
    status: "completed",
    conclusion: "success",
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    html_url: "https://github.com/raycast/extensions/actions/runs/4",
    repository: "raycast/neuralink",
  },
  {
    id: 5,
    name: "Self-reference this extension",
    status: "completed",
    conclusion: "success",
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    html_url: "https://github.com/raycast/extensions",
    repository: "raycast/extensions",
  },
];
