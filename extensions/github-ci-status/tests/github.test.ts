import assert from "node:assert/strict";
import { test } from "node:test";
import { GitHubClient, GitHubError } from "../src/lib/github";
import { Repository, Snapshot, WorkflowRun } from "../src/lib/model";

const repo = (id: number): Repository => ({
  id,
  full_name: `owner/repo-${id}`,
  html_url: `https://github.com/owner/repo-${id}`,
});
const run = (id: number, repository = repo(1)): WorkflowRun => ({
  id,
  name: "CI",
  display_title: "Build",
  head_branch: "main",
  head_sha: "abc123",
  html_url: `https://github.com/owner/repo-1/actions/runs/${id}`,
  status: "completed",
  conclusion: "success",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  run_attempt: 1,
  repository,
  pull_requests: [],
});
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers });
const mockFetch = (handler: (url: URL, init?: RequestInit) => Response | Promise<Response>): typeof fetch =>
  ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(new URL(String(input)), init))) as typeof fetch;
const scan = (
  client: GitHubClient,
  previous: WorkflowRun[] = [],
  onProgress: (snapshot: Snapshot) => void = () => {},
) =>
  client.scan({
    lookback: 3_600_000,
    previous,
    signal: new AbortController().signal,
    onProgress,
  });

test("fetching a tracked run uses its ID without a lookback or repository discovery", async () => {
  const client = new GitHubClient(
    "secret",
    mockFetch((url) => {
      assert.equal(url.pathname, "/repos/owner/repo-1/actions/runs/42");
      assert.equal(url.search, "");
      return json({ ...run(42), created_at: "2020-01-01T00:00:00Z" });
    }),
  );
  const result = await client.run(repo(1), 42, new AbortController().signal);
  assert.equal(result.id, 42);
  assert.equal(result.repository.full_name, "owner/repo-1");
});

test("discovery paginates, deduplicates, and uses a cache without dropping archived repositories", async () => {
  let calls = 0;
  let stored: { repositories: Repository[]; savedAt: number } | undefined;
  const client = new GitHubClient(
    "secret",
    mockFetch((url, init) => {
      calls++;
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer secret");
      assert.equal(url.searchParams.get("affiliation"), "owner,collaborator,organization_member");
      return url.searchParams.get("page") === "1"
        ? json([repo(1)], 200, { link: '<https://api.github.com/user/repos?page=2>; rel="next"' })
        : json([repo(1), { ...repo(2), archived: true }]);
    }),
    {
      get: () => stored,
      set: (value) => {
        stored = value;
      },
    },
  );
  const signal = new AbortController().signal;
  assert.equal((await client.repositories(signal)).length, 2);
  assert.equal((await client.repositories(signal)).length, 2);
  assert.equal(calls, 2);
  await client.repositories(signal, true);
  assert.equal(calls, 4);
});

test("run fetching includes creation range, follows pages, and retains latest rerun", async () => {
  const now = Date.now();
  const client = new GitHubClient(
    "secret",
    mockFetch((url) => {
      assert.equal(
        url.searchParams.get("created"),
        `${new Date(now - 3_600_000).toISOString()}..${new Date(now).toISOString()}`,
      );
      return url.searchParams.get("page") === "1"
        ? json({ workflow_runs: [run(1)], total_count: 2 }, 200, { link: '<https://api.github.com/page2>; rel="next"' })
        : json({ workflow_runs: [{ ...run(1), run_attempt: 2 }, run(2)], total_count: 2 });
    }),
  );
  const result = await client.runs(repo(1), now - 3_600_000, now, new AbortController().signal);
  assert.equal(result.runs.length, 2);
  assert.equal(result.runs.find((item) => item.id === 1)?.run_attempt, 2);
  assert.equal(result.truncated, false);
});

test("scan retains failed repository data, removes inaccessible and expired data, and replaces successful rows", async () => {
  const client = new GitHubClient(
    "secret",
    mockFetch((url) => {
      if (url.pathname === "/user/repos") return json([repo(1), repo(2)]);
      if (url.pathname.includes("repo-1")) return json({ workflow_runs: [], total_count: 0 });
      return json({ message: "Forbidden" }, 403);
    }),
  );
  const old = { ...run(4, repo(2)), created_at: "2020-01-01T00:00:00Z" };
  const result = await scan(client, [run(1), run(2, repo(2)), run(3, repo(3)), old]);
  assert.deepEqual(
    result.runs.map((item) => item.id),
    [2],
  );
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].repository, "owner/repo-2");
  assert.equal(result.checked, 2);
  assert.ok(result.finishedAt);
});

test("scan uses at most four workers and publishes progressive results", async () => {
  let active = 0;
  let maximum = 0;
  const events: number[] = [];
  const client = new GitHubClient(
    "secret",
    mockFetch(async (url) => {
      if (url.pathname === "/user/repos") return json(Array.from({ length: 9 }, (_, index) => repo(index)));
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return json({ workflow_runs: [], total_count: 0 });
    }),
  );
  const result = await scan(client, [], (state) => events.push(state.checked));
  assert.equal(maximum, 4);
  assert.equal(result.checked, 9);
  assert.deepEqual(events, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("explicit selection fetches only selected repositories without discovery or unselected cached runs", async () => {
  const paths: string[] = [];
  const snapshots: Snapshot[] = [];
  const client = new GitHubClient(
    "secret",
    mockFetch((url) => {
      paths.push(url.pathname);
      assert.equal(url.pathname, "/repos/owner/repo-2/actions/runs");
      return json({ message: "Forbidden" }, 403);
    }),
  );
  const result = await client.scan({
    lookback: 3_600_000,
    previous: [run(1), run(2, repo(2))],
    repositories: [repo(2)],
    forceDiscovery: true,
    signal: new AbortController().signal,
    onProgress: (snapshot) => snapshots.push(snapshot),
  });
  assert.deepEqual(paths, ["/repos/owner/repo-2/actions/runs"]);
  assert.equal(result.total, 1);
  assert.equal(result.checked, 1);
  assert.deepEqual(
    result.runs.map((item) => item.id),
    [2],
  );
  assert.ok(snapshots.every((snapshot) => snapshot.runs.every((item) => item.repository.id === 2)));
  assert.equal(result.issues[0].repository, "owner/repo-2");
});

test("empty selection makes no requests and clears previous results", async () => {
  const client = new GitHubClient(
    "secret",
    mockFetch(() => {
      assert.fail("No GitHub requests should be made when no repositories are selected");
    }),
  );
  const result = await client.scan({
    lookback: 3_600_000,
    previous: [run(1)],
    repositories: [],
    signal: new AbortController().signal,
    onProgress: () => {},
  });
  assert.deepEqual(result.runs, []);
  assert.deepEqual(result.issues, []);
  assert.equal(result.total, 0);
  assert.equal(result.checked, 0);
});

test("all-repositories selection preserves automatic discovery", async () => {
  const paths: string[] = [];
  const client = new GitHubClient(
    "secret",
    mockFetch((url) => {
      paths.push(url.pathname);
      return url.pathname === "/user/repos" ? json([repo(1)]) : json({ workflow_runs: [run(1)], total_count: 1 });
    }),
  );
  const result = await client.scan({
    lookback: 3_600_000,
    previous: [],
    repositories: null,
    signal: new AbortController().signal,
    onProgress: () => {},
  });
  assert.deepEqual(paths, ["/user/repos", "/repos/owner/repo-1/actions/runs"]);
  assert.equal(result.runs.length, 1);
});

test("rate limit stops queued requests and honors retry backoff across scans", async () => {
  let runCalls = 0;
  const client = new GitHubClient(
    "secret",
    mockFetch((url) => {
      if (url.pathname === "/user/repos") return json(Array.from({ length: 20 }, (_, index) => repo(index)));
      runCalls++;
      return json({ message: "rate limit" }, 429, { "retry-after": "120" });
    }),
  );
  const result = await scan(client);
  assert.ok(runCalls <= 4);
  assert.ok(result.checked < result.total);
  assert.ok(result.issues.some((issue) => issue.message.includes("not scanned")));
  await assert.rejects(scan(client), (error: unknown) => error instanceof GitHubError && error.status === 429);
});

test("secondary rate limits without headers pause requests", async () => {
  const client = new GitHubClient(
    "secret",
    mockFetch(() => json({ message: "You have exceeded a secondary rate limit." }, 403)),
  );
  await assert.rejects(
    client.repositories(new AbortController().signal),
    (error: unknown) => error instanceof GitHubError && error.stopScan,
  );
});

test("invalid authentication produces an actionable error", async () => {
  const client = new GitHubClient(
    "secret",
    mockFetch(() => json({}, 401)),
  );
  await assert.rejects(scan(client), /Sign out in extension preferences/);
});

test("GitHub's 1000-result cap is reported instead of silently truncating", async () => {
  let requests = 0;
  const client = new GitHubClient(
    "secret",
    mockFetch(() => {
      requests++;
      return json({ workflow_runs: [run(requests)], total_count: 1001 }, 200, {
        link: '<https://api.github.com/next>; rel="next"',
      });
    }),
  );
  const result = await client.runs(repo(1), Date.now() - 3_600_000, Date.now(), new AbortController().signal);
  assert.equal(requests, 10);
  assert.equal(result.truncated, true);
});

test("aborting a scan propagates cancellation", async () => {
  const controller = new AbortController();
  const client = new GitHubClient(
    "secret",
    mockFetch((_url, init) => {
      init?.signal?.throwIfAborted();
      return json([repo(1)]);
    }),
  );
  controller.abort();
  await assert.rejects(
    client.scan({ lookback: 3_600_000, previous: [], signal: controller.signal, onProgress: () => {} }),
    { name: "AbortError" },
  );
});
