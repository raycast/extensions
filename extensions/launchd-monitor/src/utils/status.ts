import { Icon } from "@raycast/api";
import { JobStatus, OverallStatus } from "../api/types";

export function getOverallStatus(jobs: JobStatus[]): OverallStatus {
  // Priority (highest first): failures, running, not-loaded, ok.
  // Failures outrank everything else — they're higher signal than an
  // unloaded job and shouldn't hide behind another icon. Running outranks
  // not-loaded so an in-progress job is visible at a glance.
  if (jobs.some((j) => j.success === false)) return "has-failures";
  if (jobs.some((j) => j.running)) return "has-running";
  if (jobs.some((j) => !j.loaded)) return "not-loaded";
  return "all-ok";
}

export function getMenuBarIcon(status: OverallStatus): Icon {
  switch (status) {
    case "all-ok":
      return Icon.CheckCircle;
    case "has-failures":
      return Icon.ExclamationMark;
    case "has-running":
      return Icon.CircleProgress;
    case "not-loaded":
      return Icon.QuestionMark;
  }
}

export function getMenuBarTitle(jobs: JobStatus[]): string | undefined {
  const failCount = jobs.filter((j) => j.success === false).length;
  const notLoadedCount = jobs.filter((j) => !j.loaded).length;
  const parts: string[] = [];
  if (failCount > 0) parts.push(`${failCount} failed`);
  if (notLoadedCount > 0) parts.push(`${notLoadedCount} unloaded`);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function getJobIcon(job: JobStatus): Icon {
  if (!job.loaded) return Icon.QuestionMark;
  if (job.running) return Icon.CircleProgress;
  if (job.success === null) return Icon.Circle;
  return job.success ? Icon.CheckCircle : Icon.XMarkCircle;
}

export function getStatusText(job: JobStatus): string {
  if (!job.loaded) return "Not Loaded";
  if (job.running) return "Running";
  if (job.success === null) return "Never Run";
  if (job.success) return "OK";
  if (job.signal !== null) return `Killed (signal ${job.signal})`;
  return `Failed (exit ${job.lastExitCode})`;
}
