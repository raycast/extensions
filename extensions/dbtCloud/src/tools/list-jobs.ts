import { fetchFromApi, buildApiUrl } from "../api";

type Input = {
  /**
   * Optional project ID to filter jobs. If not provided, returns jobs from all projects.
   */
  projectId?: number;
};

interface Job {
  id: number;
  name: string;
  description: string;
  project_id: number;
  environment_id: number;
  dbt_version: string;
  execute_steps: string[];
  state: number;
  triggers: {
    github_webhook: boolean;
    schedule: boolean;
    custom_branch_only: boolean;
  };
  settings: {
    threads: number;
    target_name: string;
  };
  schedule: {
    cron: string;
    date: {
      type: string;
    };
    time: {
      type: string;
      interval: number;
    };
  };
  next_run: string | null;
  next_run_humanized: string | null;
}

/**
 * List dbt Cloud jobs
 */
export default async function tool(input: Input) {
  const endpoint = input.projectId ? buildApiUrl(`/jobs/`, { project_id: input.projectId }) : buildApiUrl("/jobs/");

  const jobs = await fetchFromApi<Job>(endpoint);

  if (!jobs || jobs.length === 0) {
    return { jobs: [], message: "No jobs found." };
  }

  return {
    count: jobs.length,
    jobs: jobs.map((job) => ({
      id: job.id,
      name: job.name,
      description: job.description || null,
      projectId: job.project_id,
      environmentId: job.environment_id,
      dbtVersion: job.dbt_version,
      executeSteps: job.execute_steps,
      isScheduled: job.triggers?.schedule || false,
      scheduleHumanized: job.next_run_humanized || null,
      nextRun: job.next_run || null,
    })),
  };
}
