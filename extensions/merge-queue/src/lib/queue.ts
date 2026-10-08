import { secondsBetween } from "./format";
import { graphql, GhError, RepoConfig, repoSlug, rest } from "./gh";

export type CheckState = "failure" | "pending" | "success" | "skipped" | "neutral";

export type Check = {
  name: string;
  workflow?: string;
  state: CheckState;
  conclusion?: string;
  required: boolean;
  url?: string;
  jobId?: number;
  runId?: number;
  startedAt?: string;
  completedAt?: string;
};

export type Health = "merging" | "failing" | "conflict" | "running" | "queued" | "passing";

export type PullRequestSummary = {
  number: number;
  title: string;
  url: string;
  author: string;
  avatarUrl?: string;
  branch: string;
};

export type QueueEntry = {
  id: string;
  position: number;
  state: string;
  etaSeconds?: number;
  enqueuedAt: string;
  enqueuer?: string;
  pr: PullRequestSummary;
  headSha?: string;
  isMine: boolean;
  checks: Check[];
  health: Health;
  failingRequired: Check[];
  failingOptional: Check[];
  requiredDone: number;
  requiredTotal: number;
};

export type QueueSnapshot = {
  viewer: string;
  url: string;
  repo: string;
  branch: string;
  fetchedAt: string;
  entries: QueueEntry[];
};

export type RawCheckRun = {
  __typename: "CheckRun";
  databaseId: number;
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  checkSuite: { workflowRun: { databaseId: number; workflow: { name: string } } | null } | null;
};

export type RawStatusContext = {
  __typename: "StatusContext";
  context: string;
  state: string;
  targetUrl: string | null;
  createdAt: string;
};

export type RawEntry = {
  id: string;
  position: number;
  state: string;
  estimatedTimeToMerge: number | null;
  enqueuedAt: string;
  enqueuer: { login: string } | null;
  pullRequest: {
    number: number;
    title: string;
    url: string;
    headRefName: string;
    author: { login: string; avatarUrl: string } | null;
  } | null;
  headCommit: {
    oid?: string;
    statusCheckRollup: { contexts: { nodes: (RawCheckRun | RawStatusContext | null)[] } } | null;
  } | null;
};

export type QueueResponse = {
  viewer: { login: string };
  repository: {
    defaultBranchRef: { name: string } | null;
    mergeQueue: { url: string; entries: { nodes: RawEntry[] } } | null;
  } | null;
};

export type RawRule = {
  type: string;
  parameters?: { required_status_checks?: { context: string }[] };
};

export type RawBranch = {
  protection?: { required_status_checks?: { contexts?: string[]; checks?: { context: string }[] } };
};

const QUEUE_QUERY = `
query($owner: String!, $name: String!, $branch: String) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    defaultBranchRef { name }
    mergeQueue(branch: $branch) {
      url
      entries(first: 50) {
        nodes {
          id
          position
          state
          estimatedTimeToMerge
          enqueuedAt
          enqueuer { login }
          pullRequest { number title url headRefName author { login avatarUrl } }
          headCommit {
            oid
            statusCheckRollup {
              contexts(first: 100) {
                nodes {
                  __typename
                  ... on CheckRun {
                    databaseId
                    name
                    status
                    conclusion
                    detailsUrl
                    startedAt
                    completedAt
                    checkSuite { workflowRun { databaseId workflow { name } } }
                  }
                  ... on StatusContext { context state targetUrl createdAt }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

const FAILED_CONCLUSIONS = new Set(["FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE"]);

const STATE_ORDER: Record<CheckState, number> = { failure: 0, pending: 1, success: 2, neutral: 2, skipped: 2 };

function checkRunState(status: string, conclusion: string | null): CheckState {
  if (status !== "COMPLETED") {
    return "pending";
  }
  if (conclusion === "SUCCESS") {
    return "success";
  }
  if (conclusion === "SKIPPED") {
    return "skipped";
  }
  if (conclusion && FAILED_CONCLUSIONS.has(conclusion)) {
    return "failure";
  }
  return "neutral";
}

function statusContextState(state: string): CheckState {
  if (state === "SUCCESS") {
    return "success";
  }
  if (state === "FAILURE" || state === "ERROR") {
    return "failure";
  }
  return "pending";
}

function toCheck(raw: RawCheckRun | RawStatusContext, required: Set<string>): Check {
  if (raw.__typename === "StatusContext") {
    return {
      name: raw.context,
      state: statusContextState(raw.state),
      conclusion: raw.state.toLowerCase(),
      required: required.has(raw.context),
      url: raw.targetUrl ?? undefined,
      startedAt: raw.createdAt,
    };
  }
  const run = raw.checkSuite?.workflowRun ?? undefined;
  return {
    name: raw.name,
    workflow: run?.workflow.name,
    state: checkRunState(raw.status, raw.conclusion),
    conclusion: (raw.conclusion ?? raw.status).toLowerCase(),
    required: required.has(raw.name),
    url: raw.detailsUrl ?? undefined,
    jobId: run ? raw.databaseId : undefined,
    runId: run?.databaseId,
    startedAt: raw.startedAt ?? undefined,
    completedAt: raw.completedAt ?? undefined,
  };
}

export function compareChecks(a: Check, b: Check): number {
  return STATE_ORDER[a.state] - STATE_ORDER[b.state];
}

function healthOf(state: string, checks: Check[], failingRequired: Check[]): Health {
  if (state === "LOCKED") {
    return "merging";
  }
  if (failingRequired.length > 0) {
    return "failing";
  }
  if (state === "UNMERGEABLE") {
    return checks.length === 0 ? "conflict" : "failing";
  }
  if (state === "MERGEABLE") {
    return "passing";
  }
  if (checks.length === 0) {
    return "queued";
  }
  if (state === "AWAITING_CHECKS" || checks.some((check) => check.state === "pending")) {
    return "running";
  }
  return "passing";
}

function requiredProgress(checks: Check[], required: Set<string>): { done: number; total: number } {
  const isDone = (check: Check) => check.state !== "pending" && check.state !== "failure";
  if (required.size === 0) {
    return { done: checks.filter((check) => check.state !== "pending").length, total: checks.length };
  }
  const doneNames = new Set(checks.filter((check) => check.required && isDone(check)).map((check) => check.name));
  return { done: doneNames.size, total: required.size };
}

function toEntry(raw: RawEntry, viewer: string, required: Set<string>): QueueEntry | undefined {
  const pr = raw.pullRequest;
  if (!pr) {
    return undefined;
  }
  const contexts = raw.headCommit?.statusCheckRollup?.contexts.nodes ?? [];
  const checks = contexts
    .filter((node): node is RawCheckRun | RawStatusContext => Boolean(node))
    .map((node) => toCheck(node, required))
    .sort(compareChecks);
  const failing = checks.filter((check) => check.state === "failure");
  const failingRequired = failing.filter((check) => check.required);
  const failingOptional = failing.filter((check) => !check.required);
  const progress = requiredProgress(checks, required);
  const author = pr.author?.login ?? "ghost";
  return {
    id: raw.id,
    position: raw.position,
    state: raw.state,
    etaSeconds: raw.estimatedTimeToMerge ?? undefined,
    enqueuedAt: raw.enqueuedAt,
    enqueuer: raw.enqueuer?.login,
    pr: {
      number: pr.number,
      title: pr.title,
      url: pr.url,
      author,
      avatarUrl: pr.author?.avatarUrl,
      branch: pr.headRefName,
    },
    headSha: raw.headCommit?.oid,
    isMine: author === viewer || raw.enqueuer?.login === viewer,
    checks,
    health: healthOf(raw.state, checks, failingRequired),
    failingRequired,
    failingOptional,
    requiredDone: progress.done,
    requiredTotal: progress.total,
  };
}

export function requiredContexts(rules: RawRule[], branch: RawBranch | undefined): string[] {
  const fromRulesets = rules.flatMap((rule) =>
    rule.type === "required_status_checks"
      ? (rule.parameters?.required_status_checks ?? []).map((check) => check.context)
      : [],
  );
  const protection = branch?.protection?.required_status_checks;
  const fromProtection = [...(protection?.contexts ?? []), ...(protection?.checks ?? []).map((check) => check.context)];
  return [...new Set([...fromRulesets, ...fromProtection])];
}

export async function fetchRequiredChecks(config: RepoConfig, branch: string): Promise<string[]> {
  const encoded = encodeURIComponent(branch);
  const [rules, protection] = await Promise.allSettled([
    rest<RawRule[]>(config, `repos/${repoSlug(config)}/rules/branches/${encoded}?per_page=100`),
    rest<RawBranch>(config, `repos/${repoSlug(config)}/branches/${encoded}`),
  ]);
  if (rules.status === "rejected" && protection.status === "rejected") {
    throw rules.reason;
  }
  return requiredContexts(
    rules.status === "fulfilled" ? rules.value : [],
    protection.status === "fulfilled" ? protection.value : undefined,
  );
}

export function queueBranch(config: Pick<RepoConfig, "branch">, data: QueueResponse): string {
  return config.branch || data.repository?.defaultBranchRef?.name || "main";
}

export function parseQueue(
  config: Pick<RepoConfig, "owner" | "name" | "branch">,
  data: QueueResponse,
  requiredChecks: string[],
  now = new Date(),
): QueueSnapshot {
  const branch = queueBranch(config, data);
  if (!data.repository) {
    throw new GhError(`Couldn't find ${repoSlug(config)}`, "not-found", { repo: repoSlug(config) });
  }
  const queue = data.repository.mergeQueue;
  if (!queue) {
    throw new GhError(`${repoSlug(config)} has no merge queue on ${branch}`, "no-queue", {
      repo: repoSlug(config),
      branch,
    });
  }
  const required = new Set(requiredChecks);
  const viewer = data.viewer.login;
  const entries = queue.entries.nodes
    .map((raw) => toEntry(raw, viewer, required))
    .filter((entry): entry is QueueEntry => Boolean(entry))
    .sort((a, b) => a.position - b.position);
  return {
    viewer,
    url: queue.url,
    repo: repoSlug(config),
    branch,
    fetchedAt: now.toISOString(),
    entries,
  };
}

export async function fetchQueue(
  config: RepoConfig,
  requiredChecksFor: (branch: string) => Promise<string[]>,
): Promise<QueueSnapshot> {
  const data = await graphql<QueueResponse>(config, QUEUE_QUERY, {
    owner: config.owner,
    name: config.name,
    branch: config.branch || undefined,
  }).catch((error: unknown) => {
    if (error instanceof GhError && (error.kind === "not-found" || error.kind === "sso")) {
      throw new GhError(error.message, error.kind, { ...error.details, repo: repoSlug(config) });
    }
    throw error;
  });
  return parseQueue(config, data, await requiredChecksFor(queueBranch(config, data)));
}

export function failingRunIds(entry: QueueEntry): number[] {
  const runIds = [...entry.failingRequired, ...entry.failingOptional]
    .map((check) => check.runId)
    .filter((runId): runId is number => runId !== undefined);
  return [...new Set(runIds)];
}

export function primaryFailingJob(entry: QueueEntry): Check | undefined {
  const runtime = (check: Check) => secondsBetween(check.startedAt, check.completedAt) ?? 0;
  return [...entry.failingRequired, ...entry.failingOptional]
    .filter((check) => check.jobId !== undefined)
    .sort((a, b) => Number(b.required) - Number(a.required) || runtime(b) - runtime(a))[0];
}
