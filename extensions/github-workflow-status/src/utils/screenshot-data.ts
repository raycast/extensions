import { WorkflowRun } from "../types";

export const SCREENSHOT_RUNS: WorkflowRun[] = [
  {
    id: 1234567890,
    name: "CI",
    status: "in_progress",
    conclusion: null,
    created_at: "2024-03-20T10:00:00Z",
    html_url: "https://github.com/raycast/extensions/actions/runs/1234567890",
    repository: "raycast/extensions",
    workflow_id: 1,
  },
  {
    id: 1234567891,
    name: "Test",
    status: "completed",
    conclusion: "success",
    created_at: "2024-03-20T09:45:00Z",
    html_url: "https://github.com/raycast/extensions/actions/runs/1234567891",
    repository: "raycast/extensions",
    workflow_id: 2,
  },
  {
    id: 1234567892,
    name: "Build",
    status: "completed",
    conclusion: "failure",
    created_at: "2024-03-20T09:30:00Z",
    html_url: "https://github.com/raycast/extensions/actions/runs/1234567892",
    repository: "raycast/extensions",
    workflow_id: 3,
  },
  {
    id: 1234567893,
    name: "Deploy",
    status: "completed",
    conclusion: "skipped",
    created_at: "2024-03-20T09:15:00Z",
    html_url: "https://github.com/raycast/extensions/actions/runs/1234567893",
    repository: "raycast/extensions",
    workflow_id: 4,
  },
];
