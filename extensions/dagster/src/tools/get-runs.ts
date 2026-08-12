import { dagsterRunUrl, fetchRuns } from "../api";
import { formatTimestamp, formatDuration } from "../helpers";

type Input = {
  /**
   * Filter runs by status. One of: SUCCESS, FAILURE, STARTED, STARTING, QUEUED, CANCELED, CANCELING.
   * Leave empty to return all runs.
   */
  status?: string;

  /**
   * Filter runs by job name. Partial match is supported. Leave empty to return all jobs.
   */
  jobName?: string;
};

export default async function (input: Input) {
  const runs = await fetchRuns();

  const filtered = runs.filter((r) => {
    if (input.status && r.status !== input.status.toUpperCase()) return false;
    if (input.jobName && !r.jobName.toLowerCase().includes(input.jobName.toLowerCase())) return false;
    return true;
  });

  const recent = filtered.slice(0, 50);

  if (recent.length === 0) {
    return "No runs found matching the filters.";
  }

  const lines = recent.map((r) => {
    const start = formatTimestamp(r.startTime);
    const duration = r.startTime && r.endTime ? formatDuration(r.endTime - r.startTime) : r.startTime ? "running" : "";
    return `- ${r.id.slice(0, 8)} | ${r.status} | ${r.jobName} | ${start} | ${duration} | ${dagsterRunUrl(r.id)}`;
  });

  return `${recent.length} run(s):\n${lines.join("\n")}`;
}
