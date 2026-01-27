import { CronJob, JobRunDetail, JobStatus } from "./types";

export function normalizeStatus(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function jobRunHadErrors(run: JobRunDetail): boolean {
  const normalized = normalizeStatus(run.status);
  const isSuccess = normalized === "succeeded" || normalized === "success";
  if (isSuccess) {
    return normalizeStatus(run.return_message).includes("error");
  }
  // Only return true for actual failure statuses
  const isFailed =
    normalized.includes("failed") || normalized.includes("error");
  return isFailed;
}

export function computeJobStatus(
  job: CronJob & { lastRun?: JobRunDetail | null },
): JobStatus {
  if (job.lastRun) {
    const normalized = normalizeStatus(job.lastRun.status);
    if (normalized.includes("running") || normalized.includes("start"))
      return "running";
    if (jobRunHadErrors(job.lastRun)) return "failed";
    if (normalized.includes("success") || normalized.includes("succeeded"))
      return "success";
    if (normalized.includes("failed") || normalized.includes("error"))
      return "failed";
  }

  return "unknown";
}

export function statusLabel(status: JobStatus): string {
  switch (status) {
    case "running":
      return "Running";
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

export function formatDuration(
  start?: string | null,
  end?: string | null,
): string {
  if (!start || !end) return "-";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
    return "-";

  const totalSeconds = Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / 1000),
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}
