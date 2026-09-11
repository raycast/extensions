import { Color, Icon } from "@raycast/api";
import { formatDateTime, formatDuration, relativeTime } from "./format";
import type { DescriptJob, JobState, JobType } from "./types";

const TERMINAL_STATES: ReadonlyArray<JobState> = ["stopped", "failed", "cancelled"];

export function isTerminalState(state: JobState | undefined): boolean {
  if (!state) return false;
  return TERMINAL_STATES.includes(state);
}

export function humanizeJobType(type: JobType | undefined): string {
  if (!type) return "Job";
  switch (type) {
    case "import/project_media":
    case "import":
    case "import_project_media":
      return "Import";
    case "agent":
      return "Underlord";
    case "publish":
      return "Publish";
    case "transcribe":
      return "Transcribe";
    case "export":
      return "Export";
    default:
      return type
        .split(/[_-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

/**
 * Returns a compact relative-time string for the most relevant moment on a
 * job ("4 minutes ago", "yesterday") and a verbose tooltip carrying the
 * absolute timestamps + total duration. The verb (`Started` / `Finished` /
 * `Failed` / `Cancelled`) is intentionally pushed to the tooltip — the
 * status tag rendered next to this accessory already labels the state, so
 * the visible accessory just needs to answer "when".
 *
 * Returns `null` when there's no usable timestamp on the job (rare, but
 * possible for very fresh jobs where the API hasn't echoed `created_at` yet).
 */
export function jobTimingDescription(job: DescriptJob): { text: string; tooltip: string } | null {
  const terminal = isTerminalState(job.job_state);
  const startedAt = job.created_at;
  const finishedAt = terminal ? (job.stopped_at ?? job.updated_at) : undefined;

  if (terminal) {
    if (!finishedAt) return null;
    const finishedRel = relativeTime(finishedAt);
    if (!finishedRel) return null;

    const verb = job.job_state === "cancelled" ? "Canceled" : job.job_state === "failed" ? "Failed" : "Finished";
    const tooltipParts: string[] = [];
    const finishedAbs = formatDateTime(finishedAt);
    if (finishedAbs) tooltipParts.push(`${verb} ${finishedAbs}`);
    if (startedAt) {
      const startedAbs = formatDateTime(startedAt);
      if (startedAbs) tooltipParts.push(`Started ${startedAbs}`);
      const durationSeconds = (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000;
      const duration = formatDuration(durationSeconds);
      if (duration) tooltipParts.push(`Ran for ${duration}`);
    }
    return { text: finishedRel, tooltip: tooltipParts.join(" · ") };
  }

  if (!startedAt) return null;
  const startedRel = relativeTime(startedAt);
  if (!startedRel) return null;
  const startedAbs = formatDateTime(startedAt);
  return { text: startedRel, tooltip: startedAbs ? `Started ${startedAbs}` : `Started ${startedRel}` };
}

export function jobStatusAccessory(job: DescriptJob): { value: string; color: Color; icon: Icon } {
  if (job.job_state === "running") {
    return { value: "Running", color: Color.Blue, icon: Icon.CircleProgress };
  }
  if (job.job_state === "queued") {
    return { value: "Queued", color: Color.SecondaryText, icon: Icon.Clock };
  }
  if (job.job_state === "cancelled") {
    return { value: "Canceled", color: Color.SecondaryText, icon: Icon.XMarkCircle };
  }
  if (job.job_state === "failed" || job.result?.status === "failure") {
    return { value: "Failed", color: Color.Red, icon: Icon.ExclamationMark };
  }
  if (job.job_state === "stopped") {
    if (job.result?.status === "partial_success") {
      return { value: "Partial", color: Color.Yellow, icon: Icon.Warning };
    }
    return { value: "Done", color: Color.Green, icon: Icon.CheckCircle };
  }
  return { value: job.job_state ?? "Unknown", color: Color.SecondaryText, icon: Icon.Circle };
}
