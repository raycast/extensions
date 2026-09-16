import { fetchFromApi, buildApiUrl, getStatusText, formatDuration } from "../api";

type Input = {
  /**
   * The job ID to get runs for
   */
  jobId: number;
  /**
   * Maximum number of runs to return (default: 10)
   */
  limit?: number;
};

interface Run {
  id: number;
  job_id: number;
  project_id: number;
  environment_id: number;
  status: number;
  status_humanized: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: string | null;
  duration_humanized: string | null;
  trigger: {
    cause: string;
    git_branch: string | null;
    git_sha: string | null;
  };
  run_steps: Array<{
    name: string;
    status: number;
    status_humanized: string;
    index: number;
    started_at: string | null;
    finished_at: string | null;
  }>;
}

/**
 * Get recent runs for a dbt Cloud job
 */
export default async function tool(input: Input) {
  const limit = input.limit || 10;
  const endpoint = buildApiUrl("/runs/", { job_definition_id: input.jobId, limit });

  const runs = await fetchFromApi<Run>(endpoint);

  if (!runs || runs.length === 0) {
    return { runs: [], message: `No runs found for job ${input.jobId}.` };
  }

  return {
    jobId: input.jobId,
    count: runs.length,
    runs: runs.map((run) => ({
      id: run.id,
      status: getStatusText(run.status),
      statusCode: run.status,
      createdAt: run.created_at,
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      duration: run.duration_humanized || formatDuration(run.started_at, run.finished_at),
      trigger: run.trigger?.cause || "Unknown",
      gitBranch: run.trigger?.git_branch || null,
      gitSha: run.trigger?.git_sha || null,
      steps:
        run.run_steps?.map((step) => ({
          name: step.name,
          status: step.status_humanized,
          index: step.index,
        })) || [],
    })),
  };
}
