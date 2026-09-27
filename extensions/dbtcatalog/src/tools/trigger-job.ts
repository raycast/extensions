import { Tool } from "@raycast/api";
import { triggerJobRun, fetchFromApi, buildApiUrl } from "../api";

type Input = {
  /**
   * The job ID to trigger. Use list-jobs to find available jobs and their IDs.
   */
  jobId: number;
  /**
   * Optional cause/reason for triggering the job
   */
  cause?: string;
  /**
   * Optional git branch to run on (overrides the job's default branch)
   */
  gitBranch?: string;
};

interface Job {
  id: number;
  name: string;
  project_id: number;
}

/**
 * Trigger a dbt Cloud job run
 */
export default async function tool(input: Input) {
  const result = await triggerJobRun(input.jobId, input.cause || "Triggered via Raycast AI", input.gitBranch);

  if (!result) {
    return { error: `Failed to trigger job ${input.jobId}. Please check the job ID is correct.` };
  }

  return {
    success: true,
    runId: result.id,
    jobId: input.jobId,
    message: `Successfully triggered job. Run ID: ${result.id}`,
  };
}

/**
 * Confirm before triggering a job
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Fetch job details to show the name
  const jobs = await fetchFromApi<Job>(buildApiUrl("/jobs/"));
  const job = jobs.find((j) => j.id === input.jobId);
  const jobName = job?.name || `Job #${input.jobId}`;

  return {
    message: `Are you sure you want to trigger "${jobName}"?`,
    info: [
      { name: "Job ID", value: String(input.jobId) },
      ...(input.cause ? [{ name: "Cause", value: input.cause }] : []),
      ...(input.gitBranch ? [{ name: "Git Branch", value: input.gitBranch }] : []),
    ],
  };
};
