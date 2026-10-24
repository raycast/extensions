import { type Job } from "./slurm";

const STATE_ORDER = ["RUNNING", "PENDING", "COMPLETING"];

export function countByState(jobs: Job[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const job of jobs) out[job.state] = (out[job.state] ?? 0) + 1;
  return out;
}

export function formatCounts(counts: Record<string, number>): string {
  const parts: string[] = [];
  for (const state of STATE_ORDER) {
    if (counts[state]) parts.push(`${state[0]}${counts[state]}`);
  }
  for (const [state, count] of Object.entries(counts)) {
    if (!STATE_ORDER.includes(state)) parts.push(`${state[0]}${count}`);
  }
  return parts.join("·") || "idle";
}

export function formatMenuTitle(counts: Record<string, number>): string {
  const running = counts.RUNNING ?? 0;
  const pending = counts.PENDING ?? 0;
  const completing = counts.COMPLETING ?? 0;
  if (!running && !pending && !completing) return "idle";

  const parts: string[] = [];
  if (running) parts.push(`R${running}`);
  if (pending) parts.push(`P${pending}`);
  if (completing) parts.push(`CG${completing}`);
  return parts.join("·");
}

export function jobHaystack(host: string, job: Job): string {
  return [host, job.jobId, job.partition, job.state, job.name, job.user ?? "", job.reasonOrNodeList].join(" ");
}
