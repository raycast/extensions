import { gh, graphql, RepoConfig, repoSlug, rest } from "./gh";
import { CheckState } from "./queue";

export type JobStep = {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt?: string;
  completedAt?: string;
};

export type Job = {
  id: number;
  runId: number;
  runAttempt: number;
  name: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  runUrl: string;
  startedAt?: string;
  completedAt?: string;
  workflowName?: string;
  runnerName?: string;
  headSha?: string;
  steps: JobStep[];
};

export type Annotation = {
  level: string;
  title?: string;
  message: string;
  path: string;
  line?: number;
};

type RawJob = {
  id: number;
  run_id: number;
  run_attempt: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  run_url: string;
  started_at: string | null;
  completed_at: string | null;
  workflow_name?: string;
  runner_name?: string | null;
  head_sha?: string;
  steps?: {
    number: number;
    name: string;
    status: string;
    conclusion: string | null;
    started_at: string | null;
    completed_at: string | null;
  }[];
};

type RawAnnotation = {
  path: string;
  start_line: number | null;
  annotation_level: string;
  title: string | null;
  message: string;
};

export async function fetchJob(config: RepoConfig, jobId: number): Promise<Job> {
  const raw = await rest<RawJob>(config, `repos/${repoSlug(config)}/actions/jobs/${jobId}`);
  return {
    id: raw.id,
    runId: raw.run_id,
    runAttempt: raw.run_attempt,
    name: raw.name,
    status: raw.status,
    conclusion: raw.conclusion,
    htmlUrl: raw.html_url,
    runUrl: `https://github.com/${repoSlug(config)}/actions/runs/${raw.run_id}`,
    startedAt: raw.started_at ?? undefined,
    completedAt: raw.completed_at ?? undefined,
    workflowName: raw.workflow_name,
    runnerName: raw.runner_name ?? undefined,
    headSha: raw.head_sha,
    steps: (raw.steps ?? []).map((step) => ({
      number: step.number,
      name: step.name,
      status: step.status,
      conclusion: step.conclusion,
      startedAt: step.started_at ?? undefined,
      completedAt: step.completed_at ?? undefined,
    })),
  };
}

export async function fetchAnnotations(config: RepoConfig, jobId: number): Promise<Annotation[]> {
  const raw = await rest<RawAnnotation[]>(
    config,
    `repos/${repoSlug(config)}/check-runs/${jobId}/annotations?per_page=50`,
  );
  return raw.map((annotation) => ({
    level: annotation.annotation_level,
    title: annotation.title || undefined,
    message: annotation.message,
    path: annotation.path,
    line: annotation.start_line ?? undefined,
  }));
}

export function fetchJobLog(config: RepoConfig, jobId: number): Promise<string> {
  return gh(config, ["api", "--allow-escape-sequences", `repos/${repoSlug(config)}/actions/jobs/${jobId}/logs`]);
}

const PASSING_RUNS_TO_SEARCH = 5;

type WorkflowRuns = { workflow_runs: { id: number; check_suite_node_id: string }[] };
type PassingCheckRuns = Record<string, { checkRuns?: { nodes: { databaseId: number }[] } } | null>;

export async function findPassingJob(
  config: RepoConfig,
  failing: Pick<Job, "runId" | "name">,
): Promise<{ jobId: number; workflowId: number } | undefined> {
  const slug = repoSlug(config);
  const run = await rest<{ workflow_id: number; event: string }>(config, `repos/${slug}/actions/runs/${failing.runId}`);
  const passingRuns = async (event?: string) => {
    const filter = event ? `&event=${encodeURIComponent(event)}` : "";
    const { workflow_runs: runs } = await rest<WorkflowRuns>(
      config,
      `repos/${slug}/actions/workflows/${run.workflow_id}/runs?status=success&exclude_pull_requests=true&per_page=${PASSING_RUNS_TO_SEARCH}${filter}`,
    );
    return runs;
  };
  const sameEvent = await passingRuns(run.event);
  const runs = sameEvent.length > 0 ? sameEvent : await passingRuns();
  if (runs.length === 0) {
    return undefined;
  }
  const variables: Record<string, string> = { job: failing.name };
  runs.forEach((candidate, index) => {
    variables[`suite${index}`] = candidate.check_suite_node_id;
  });
  const declarations = runs.map((_, index) => `$suite${index}: ID!`).join(", ");
  const fields = runs.map((_, index) => `suite${index}: node(id: $suite${index}) { ...passing }`).join(" ");
  const query = `query($job: String!, ${declarations}) { ${fields} } fragment passing on CheckSuite { checkRuns(first: 1, filterBy: { checkName: $job, status: COMPLETED, conclusions: [SUCCESS] }) { nodes { databaseId } } }`;
  const data = await graphql<PassingCheckRuns>(config, query, variables);
  for (let index = 0; index < runs.length; index++) {
    const jobId = data[`suite${index}`]?.checkRuns?.nodes[0]?.databaseId;
    if (jobId) {
      return { jobId, workflowId: run.workflow_id };
    }
  }
  return undefined;
}

const MAX_PATHS_TO_CHECK = 10;

export async function filesInRepo(config: RepoConfig, sha: string, paths: string[]): Promise<Set<string>> {
  const candidates = [...new Set(paths)].slice(0, MAX_PATHS_TO_CHECK);
  if (candidates.length === 0) {
    return new Set();
  }
  const variables: Record<string, string> = { owner: config.owner, name: config.name };
  candidates.forEach((path, index) => {
    variables[`file${index}`] = `${sha}:${path}`;
  });
  const declarations = candidates.map((_, index) => `$file${index}: String!`).join(", ");
  const fields = candidates.map((_, index) => `file${index}: object(expression: $file${index}) { __typename }`);
  const query = `query($owner: String!, $name: String!, ${declarations}) { repository(owner: $owner, name: $name) { ${fields.join(" ")} } }`;
  const data = await graphql<{ repository: Record<string, { __typename: string } | null> | null }>(
    config,
    query,
    variables,
  );
  return new Set(candidates.filter((_, index) => data.repository?.[`file${index}`]?.__typename === "Blob"));
}

export async function rerunFailedJobs(config: RepoConfig, runId: number): Promise<void> {
  await gh(config, ["run", "rerun", String(runId), "--failed", "-R", repoSlug(config)]);
}

export async function rerunJob(config: RepoConfig, jobId: number): Promise<void> {
  await gh(config, ["run", "rerun", "--job", String(jobId), "-R", repoSlug(config)]);
}

const FAILED_JOB_CONCLUSIONS = new Set(["failure", "timed_out", "cancelled", "startup_failure", "action_required"]);

export function jobState(job: Job): CheckState {
  if (job.status !== "completed") {
    return "pending";
  }
  if (job.conclusion === "success") {
    return "success";
  }
  if (job.conclusion === "skipped") {
    return "skipped";
  }
  return job.conclusion && FAILED_JOB_CONCLUSIONS.has(job.conclusion) ? "failure" : "neutral";
}
