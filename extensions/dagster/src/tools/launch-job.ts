import { Tool } from "@raycast/api";
import { dagsterRunUrl, fetchJobs, launchRun } from "../api";

type Input = {
  /**
   * The exact name of the Dagster job to launch. Use get-jobs to find available job names.
   */
  jobName: string;
};

async function findJob(jobName: string) {
  const jobs = await fetchJobs();
  const job = jobs.find((j) => j.name === jobName);
  if (!job) {
    const similar = jobs.filter((j) => j.name.toLowerCase().includes(jobName.toLowerCase()));
    if (similar.length > 0) {
      throw new Error(`Job "${jobName}" not found. Did you mean: ${similar.map((j) => j.name).join(", ")}?`);
    }
    throw new Error(`Job "${jobName}" not found.`);
  }
  return job;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const job = await findJob(input.jobName);
  return {
    info: [
      { name: "Job", value: job.name },
      { name: "Location", value: job.locationName },
      { name: "Repository", value: job.repositoryName },
    ],
  };
};

export default async function (input: Input) {
  const job = await findJob(input.jobName);
  const runId = await launchRun(job.name, job.repositoryName, job.locationName);
  return `Launched run ${runId} for job "${job.name}". ${dagsterRunUrl(runId)}`;
}
