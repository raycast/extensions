import { fetchJobs } from "../api";
import { formatTimestamp, formatDuration } from "../helpers";

type Input = {
  /**
   * Filter jobs by name. Partial match is supported. Leave empty to return all jobs.
   */
  jobName?: string;
};

export default async function (input: Input) {
  const jobs = await fetchJobs();

  const filtered = input.jobName
    ? jobs.filter((j) => j.name.toLowerCase().includes(input.jobName!.toLowerCase()))
    : jobs;

  if (filtered.length === 0) {
    return "No jobs found matching the filter.";
  }

  const lines = filtered.map((j) => {
    const parts = [`- ${j.name} (${j.locationName})`];

    for (const s of j.schedules) {
      parts.push(`  Schedule: ${s.cronSchedule} [${s.scheduleState.status}]`);
    }

    const lastRun = j.runs[0];
    if (lastRun) {
      const start = formatTimestamp(lastRun.startTime);
      const dur = lastRun.startTime && lastRun.endTime ? formatDuration(lastRun.endTime - lastRun.startTime) : "";
      parts.push(`  Last run: ${lastRun.status} | ${start}${dur ? ` | ${dur}` : ""}`);
    } else {
      parts.push("  Last run: none");
    }

    return parts.join("\n");
  });

  return `${filtered.length} job(s):\n${lines.join("\n")}`;
}
