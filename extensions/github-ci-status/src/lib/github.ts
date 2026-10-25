import { recentRuns, Repository, ScanIssue, Snapshot, WorkflowRun } from "./model";

const API = "https://api.github.com";
const PAGE_SIZE = 100;

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly stopScan = false,
  ) {
    super(message);
  }
}

export interface RepositoryCache {
  get(): { repositories: Repository[]; savedAt: number } | undefined;
  set(value: { repositories: Repository[]; savedAt: number }): void;
}

export class GitHubClient {
  private blockedUntil = 0;

  constructor(
    private readonly token: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly repositoryCache?: RepositoryCache,
  ) {}

  private async get<T>(path: string, signal: AbortSignal): Promise<{ data: T; hasNext: boolean }> {
    if (Date.now() < this.blockedUntil) {
      throw new GitHubError(
        `GitHub rate limit reached. Retry after ${new Date(this.blockedUntil).toLocaleTimeString()}.`,
        429,
        true,
      );
    }
    const response = await this.fetcher(`${API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "raycast-github-ci-status",
      },
      signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
    });
    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after");
      const limited =
        response.status === 429 ||
        (response.status === 403 && (response.headers.get("x-ratelimit-remaining") === "0" || retryAfter !== null));
      // A secondary rate limit can be a 403 without rate limit headers.
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (limited || (response.status === 403 && /rate limit|abuse/i.test(body.message ?? ""))) {
        const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
        const retrySeconds = Number(retryAfter);
        this.blockedUntil = Math.max(Date.now() + (retrySeconds > 0 ? retrySeconds : 60) * 1000, reset || 0);
        throw new GitHubError(
          `GitHub rate limit reached. Retry after ${new Date(this.blockedUntil).toLocaleTimeString()}.`,
          response.status,
          true,
        );
      }
      if (response.status === 401)
        throw new GitHubError(
          "GitHub sign-in has expired or been revoked. Sign out in extension preferences and reopen Recent CI.",
          401,
          true,
        );
      if (response.status === 403)
        throw new GitHubError("Access denied. Check GitHub OAuth app access and organization approval/SSO.", 403);
      if (response.status === 404)
        throw new GitHubError("Repository or Actions runs are unavailable to this token.", 404);
      throw new GitHubError(`GitHub request failed (HTTP ${response.status}). Try refreshing.`, response.status);
    }
    return { data: (await response.json()) as T, hasNext: /rel="next"/.test(response.headers.get("link") ?? "") };
  }

  async repositories(signal: AbortSignal, force = false): Promise<Repository[]> {
    const cached = this.repositoryCache?.get();
    if (!force && cached && Date.now() - cached.savedAt < 15 * 60_000) return cached.repositories;
    const repositories: Repository[] = [];
    for (let page = 1; ; page++) {
      const { data, hasNext } = await this.get<Repository[]>(
        `/user/repos?affiliation=owner,collaborator,organization_member&per_page=${PAGE_SIZE}&page=${page}`,
        signal,
      );
      repositories.push(...data);
      if (!hasNext) break;
    }
    const unique = [...new Map(repositories.map((repo) => [repo.id, repo])).values()];
    this.repositoryCache?.set({ repositories: unique, savedAt: Date.now() });
    return unique;
  }

  async runs(
    repository: Repository,
    cutoff: number,
    until: number,
    signal: AbortSignal,
  ): Promise<{ runs: WorkflowRun[]; truncated: boolean }> {
    const runs: WorkflowRun[] = [];
    const range = `${new Date(cutoff).toISOString()}..${new Date(until).toISOString()}`;
    const path = repository.full_name.split("/").map(encodeURIComponent).join("/");
    for (let page = 1; ; page++) {
      const { data, hasNext } = await this.get<{ workflow_runs: WorkflowRun[]; total_count: number }>(
        `/repos/${path}/actions/runs?created=${encodeURIComponent(range)}&per_page=${PAGE_SIZE}&page=${page}`,
        signal,
      );
      runs.push(...data.workflow_runs.map((run) => ({ ...run, repository })));
      // GitHub caps filtered searches at 1,000 results. Report this rather than silently claiming completeness.
      if (page >= 10) return { runs: recentRuns(runs, cutoff), truncated: hasNext || data.total_count > 1000 };
      if (!hasNext) return { runs: recentRuns(runs, cutoff), truncated: false };
    }
  }

  async run(repository: Repository, id: number, signal: AbortSignal): Promise<WorkflowRun> {
    const path = repository.full_name.split("/").map(encodeURIComponent).join("/");
    const { data } = await this.get<WorkflowRun>(`/repos/${path}/actions/runs/${id}`, signal);
    return { ...data, repository };
  }

  async scan(options: {
    lookback: number;
    previous: WorkflowRun[];
    signal: AbortSignal;
    forceDiscovery?: boolean;
    repositories?: Repository[] | null;
    onProgress: (snapshot: Snapshot) => void;
  }): Promise<Snapshot> {
    const { signal, onProgress } = options;
    const until = Date.now();
    const cutoff = until - options.lookback;
    const repositories = options.repositories ?? (await this.repositories(signal, options.forceDiscovery));
    const accessible = new Set(repositories.map((repo) => repo.id));
    const byRepo = new Map<number, WorkflowRun[]>();
    for (const run of recentRuns(options.previous, cutoff)) {
      if (accessible.has(run.repository.id)) {
        const runs = byRepo.get(run.repository.id) ?? [];
        runs.push(run);
        byRepo.set(run.repository.id, runs);
      }
    }
    const issues: ScanIssue[] = [];
    let checked = 0;
    let cursor = 0;
    let stopped = false;
    const snapshot = (): Snapshot => ({
      runs: recentRuns([...byRepo.values()].flat(), cutoff),
      issues: [...issues],
      checked,
      total: repositories.length,
    });
    onProgress(snapshot());
    const worker = async () => {
      while (!signal.aborted && !stopped && cursor < repositories.length) {
        const repository = repositories[cursor++];
        try {
          const result = await this.runs(repository, cutoff, until, signal);
          byRepo.set(repository.id, result.runs);
          if (result.truncated)
            issues.push({
              repository: repository.full_name,
              message: "GitHub returned only the first 1,000 runs. Shorten the lookback to see all results.",
            });
        } catch (error) {
          if (signal.aborted) throw error;
          issues.push({
            repository: repository.full_name,
            message: error instanceof Error ? error.message : "Unable to fetch runs.",
          });
          if (error instanceof GitHubError && error.stopScan) stopped = true;
        }
        checked++;
        onProgress(snapshot());
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, repositories.length) }, worker));
    signal.throwIfAborted();
    if (checked < repositories.length)
      issues.push({
        message: `${repositories.length - checked} repositories were not scanned because GitHub stopped accepting requests. Cached results may be stale.`,
      });
    return { ...snapshot(), finishedAt: Date.now() };
  }
}
