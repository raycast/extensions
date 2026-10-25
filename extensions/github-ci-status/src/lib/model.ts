export interface Repository {
  id: number;
  full_name: string;
  html_url: string;
}

export interface WorkflowRun {
  id: number;
  name: string | null;
  display_title: string;
  head_branch: string | null;
  head_sha: string;
  html_url: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_attempt: number;
  repository: Repository;
  pull_requests: Array<{ number: number }>;
}

export interface ScanIssue {
  repository?: string;
  message: string;
}

export interface Snapshot {
  runs: WorkflowRun[];
  issues: ScanIssue[];
  checked: number;
  total: number;
  finishedAt?: number;
}

export function parseLookback(value: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*(m|h|d)$/i.exec(value.trim());
  const units: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  const duration = match ? Number(match[1]) * units[match[2].toLowerCase()] : NaN;
  if (!Number.isFinite(duration) || duration < 60_000 || duration > 30 * units.d) {
    throw new Error("Enter a lookback from 1 minute to 30 days, such as 30m, 1h, or 2d.");
  }
  return duration;
}

export function recentRuns<T extends Pick<WorkflowRun, "id" | "created_at">>(runs: T[], cutoff: number): T[] {
  return [
    ...new Map(runs.filter((run) => Date.parse(run.created_at) >= cutoff).map((run) => [run.id, run])).values(),
  ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id);
}

export function runStatus(run: Pick<WorkflowRun, "status" | "conclusion">): {
  label: string;
  kind: "success" | "failure" | "running" | "neutral";
} {
  if (run.status !== "completed") {
    return { label: run.status.replaceAll("_", " "), kind: "running" };
  }
  const conclusion = run.conclusion ?? "unknown";
  if (conclusion === "success") return { label: "Passed", kind: "success" };
  if (["failure", "timed_out", "action_required", "startup_failure"].includes(conclusion)) {
    return { label: conclusion.replaceAll("_", " "), kind: "failure" };
  }
  return { label: conclusion.replaceAll("_", " "), kind: "neutral" };
}
