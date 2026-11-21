import { Annotation, Job } from "./jobs";
import { QueueResponse, RawCheckRun, RawEntry } from "./queue";
import { RepoChoice } from "./repos";

export const DEMO_REPO = { owner: "acme", name: "storefront", branch: "main" };

const demoChoice = (slug: string, fields: Partial<RepoChoice>): RepoChoice => {
  const [owner, name] = slug.split("/");
  return { owner, name, slug, isPrivate: true, stars: 0, yourQueued: 0, defaultBranch: "main", ...fields };
};

export function demoChoices(now = DEMO_NOW): RepoChoice[] {
  const pushed = (minutes: number) => minutesAgo(now, minutes);
  return [
    demoChoice("acme/storefront", { queueBranch: "main", queued: 6, yourQueued: 2, pushedAt: pushed(4) }),
    demoChoice("acme/payments", { queueBranch: "main", queued: 2, pushedAt: pushed(55) }),
    demoChoice("acme/mobile", { queueBranch: "develop", defaultBranch: "main", pushedAt: pushed(3 * 60) }),
    demoChoice("acme/design-system", { queueBranch: "main", queued: 0, pushedAt: pushed(26 * 60) }),
    demoChoice("acme/docs", { pushedAt: pushed(2 * 24 * 60) }),
    demoChoice("acme/infra", { pushedAt: pushed(9 * 24 * 60) }),
  ];
}
export const DEMO_REQUIRED_CHECKS = ["build", "lint", "typecheck", "unit tests", "e2e (chromium)", "migrations"];
export const DEMO_FAILING_JOB_ID = 9100;
const DEMO_FAILURE_IDS: Record<string, number> = {
  "e2e (chromium)": 9100,
  "bundle size": 9102,
  "security audit": 9103,
};

type RunState = "success" | "failure" | "running" | "queued" | "skipped";

const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

const WORKFLOWS: Record<string, string> = {
  build: "CI",
  lint: "CI",
  typecheck: "CI",
  "unit tests": "CI",
  migrations: "CI",
  "e2e (chromium)": "E2E",
  "e2e (webkit)": "E2E",
  "bundle size": "Quality",
  lighthouse: "Quality",
  "security audit": "Quality",
};

const DEMO_NOW = new Date();
let nextId = 9000;
const runningIds = new Set<number>();

function checkRun(now: Date, name: string, state: RunState, minutes: number, length: number): RawCheckRun {
  const id = state === "failure" && DEMO_FAILURE_IDS[name] ? DEMO_FAILURE_IDS[name] : nextId++;
  if (state === "running") {
    runningIds.add(id);
  }
  const started = state === "queued" ? null : minutesAgo(now, minutes);
  const finished = state === "success" || state === "failure" || state === "skipped";
  return {
    __typename: "CheckRun",
    databaseId: id,
    name,
    status: finished ? "COMPLETED" : state === "running" ? "IN_PROGRESS" : "QUEUED",
    conclusion: finished ? state.toUpperCase() : null,
    detailsUrl: `https://github.com/acme/storefront/actions/runs/7000/job/${id}`,
    startedAt: started,
    completedAt: finished ? minutesAgo(now, Math.max(0, minutes - length)) : null,
    checkSuite: { workflowRun: { databaseId: 7000 + id, workflow: { name: WORKFLOWS[name] ?? "CI" } } },
  };
}

function entry(
  now: Date,
  fields: {
    position: number;
    number: number;
    title: string;
    author: string;
    state: string;
    enqueuedMinutesAgo: number;
    eta?: number;
    checks: RawCheckRun[];
  },
): RawEntry {
  return {
    id: `entry-${fields.number}`,
    position: fields.position,
    state: fields.state,
    estimatedTimeToMerge: fields.eta ?? null,
    enqueuedAt: minutesAgo(now, fields.enqueuedMinutesAgo),
    enqueuer: { login: fields.author },
    pullRequest: {
      number: fields.number,
      title: fields.title,
      url: `https://github.com/acme/storefront/pull/${fields.number}`,
      headRefName: `${fields.author}/${fields.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      author: { login: fields.author, avatarUrl: "" },
    },
    headCommit: {
      oid: `4f1c2a9d8e7b6c5a4f3e2d1c0b9a8f7e6d5c${fields.number}`,
      statusCheckRollup: { contexts: { nodes: fields.checks } },
    },
  };
}

function suite(now: Date, states: Partial<Record<string, RunState>>, minutes: number): RawCheckRun[] {
  return Object.keys(WORKFLOWS).map((name, index) =>
    checkRun(now, name, states[name] ?? "success", minutes - (index % 3), 4 + (index % 5) * 3),
  );
}

export function demoQueue(now = DEMO_NOW): QueueResponse {
  nextId = 9000;
  runningIds.clear();
  return {
    viewer: { login: "you" },
    repository: {
      defaultBranchRef: { name: "main" },
      mergeQueue: {
        url: "https://github.com/acme/storefront/queue/main",
        entries: {
          nodes: [
            entry(now, {
              position: 1,
              number: 4815,
              title: "Fix currency rounding on partial refunds",
              author: "jonah",
              state: "AWAITING_CHECKS",
              enqueuedMinutesAgo: 41,
              checks: suite(
                now,
                {
                  "e2e (chromium)": "failure",
                  "security audit": "failure",
                  lighthouse: "running",
                  "e2e (webkit)": "skipped",
                },
                20,
              ),
            }),
            entry(now, {
              position: 2,
              number: 4807,
              title: "Add saved carts to the account page",
              author: "you",
              state: "AWAITING_CHECKS",
              enqueuedMinutesAgo: 26,
              eta: 14 * 60,
              checks: suite(
                now,
                { "e2e (chromium)": "running", "e2e (webkit)": "running", migrations: "running", lighthouse: "queued" },
                12,
              ),
            }),
            entry(now, {
              position: 3,
              number: 4812,
              title: "Bump the checkout SDK to 3.2",
              author: "mira",
              state: "MERGEABLE",
              enqueuedMinutesAgo: 22,
              checks: suite(now, {}, 30),
            }),
            entry(now, {
              position: 4,
              number: 4820,
              title: "Move product search to the new index",
              author: "priya",
              state: "AWAITING_CHECKS",
              enqueuedMinutesAgo: 15,
              eta: 23 * 60,
              checks: suite(
                now,
                {
                  "unit tests": "running",
                  "e2e (chromium)": "running",
                  "e2e (webkit)": "queued",
                  "bundle size": "failure",
                },
                9,
              ),
            }),
            entry(now, {
              position: 5,
              number: 4822,
              title: "Remove the legacy coupon endpoint",
              author: "sam",
              state: "UNMERGEABLE",
              enqueuedMinutesAgo: 9,
              checks: [],
            }),
            entry(now, {
              position: 6,
              number: 4825,
              title: "Tidy up order confirmation emails",
              author: "you",
              state: "QUEUED",
              enqueuedMinutesAgo: 3,
              eta: 38 * 60,
              checks: [],
            }),
          ],
        },
      },
    },
  };
}

type DemoStep = [name: string, conclusion: string, startMinutesAgo: number, endMinutesAgo: number];

const DEMO_JOBS: Record<number, { name: string; workflow: string; steps: DemoStep[] }> = {
  9100: {
    name: "e2e (chromium)",
    workflow: "E2E",
    steps: [
      ["Set up job", "success", 20, 20],
      ["Check out code", "success", 20, 19],
      ["Install dependencies", "success", 19, 17],
      ["Start the app", "success", 17, 16],
      ["Run Playwright", "failure", 16, 6],
      ["Upload report", "success", 6, 6],
      ["Complete job", "success", 6, 6],
    ],
  },
  9102: {
    name: "bundle size",
    workflow: "Quality",
    steps: [
      ["Set up job", "success", 9, 9],
      ["Check out code", "success", 9, 8],
      ["Build", "success", 8, 5],
      ["Check bundle size", "failure", 5, 4],
      ["Complete job", "success", 4, 4],
    ],
  },
  9103: {
    name: "security audit",
    workflow: "Quality",
    steps: [
      ["Set up job", "success", 28, 28],
      ["Check out code", "success", 28, 27],
      ["Audit dependencies", "failure", 27, 26],
      ["Complete job", "success", 26, 26],
    ],
  },
};

const PASSING_STEPS: DemoStep[] = [
  ["Set up job", "success", 12, 12],
  ["Check out code", "success", 12, 11],
  ["Run", "success", 11, 8],
  ["Complete job", "success", 8, 8],
];

function runningJob(jobId: number, now: Date): Job {
  const runId = 7000 + jobId;
  const step = (number: number, name: string, status: string, start?: number, end?: number) => ({
    number,
    name,
    status,
    conclusion: status === "completed" ? "success" : null,
    startedAt: start === undefined ? undefined : minutesAgo(now, start),
    completedAt: end === undefined ? undefined : minutesAgo(now, end),
  });
  return {
    id: jobId,
    runId,
    runAttempt: 1,
    name: "check",
    status: "in_progress",
    conclusion: null,
    htmlUrl: `https://github.com/acme/storefront/actions/runs/${runId}/job/${jobId}`,
    runUrl: `https://github.com/acme/storefront/actions/runs/${runId}`,
    startedAt: minutesAgo(now, 9),
    steps: [
      step(1, "Set up job", "completed", 9, 9),
      step(2, "Check out code", "completed", 9, 8),
      step(3, "Install dependencies", "completed", 8, 6),
      step(4, "Run tests", "in_progress", 6),
      step(5, "Upload results", "queued"),
      step(6, "Complete job", "queued"),
    ],
  };
}

export function demoJob(jobId = DEMO_FAILING_JOB_ID, now = DEMO_NOW): Job {
  if (runningIds.has(jobId)) {
    return runningJob(jobId, now);
  }
  const demo = DEMO_JOBS[jobId];
  const steps = demo?.steps ?? PASSING_STEPS;
  const runId = 7000 + jobId;
  return {
    id: jobId,
    runId,
    runAttempt: 1,
    name: demo?.name ?? "check",
    status: "completed",
    conclusion: demo ? "failure" : "success",
    htmlUrl: `https://github.com/acme/storefront/actions/runs/${runId}/job/${jobId}`,
    runUrl: `https://github.com/acme/storefront/actions/runs/${runId}`,
    startedAt: minutesAgo(now, steps[0][2]),
    completedAt: minutesAgo(now, steps[steps.length - 1][3]),
    workflowName: demo?.workflow,
    steps: steps.map(([name, conclusion, start, end], index) => ({
      number: index + 1,
      name,
      status: "completed",
      conclusion,
      startedAt: minutesAgo(now, start),
      completedAt: minutesAgo(now, end),
    })),
  };
}

export const DEMO_ANNOTATIONS: Annotation[] = [
  {
    level: "failure",
    path: "e2e/refunds.spec.ts",
    line: 48,
    title: "[chromium] › refunds.spec.ts:31:3 › partial refund rounds to the cent",
    message: 'Expected "$12.35", received "$12.34"',
  },
];

export const DEMO_LOG = [
  "2026-10-07T14:02:11.0000000Z ##[group]Run npx playwright test --project=chromium",
  "2026-10-07T14:02:11.0000000Z npx playwright test --project=chromium",
  "2026-10-07T14:02:11.0000000Z ##[endgroup]",
  "2026-10-07T14:02:14.0000000Z Running 212 tests using 4 workers",
  "2026-10-07T14:11:40.0000000Z   1) [chromium] › refunds.spec.ts:31:3 › partial refund rounds to the cent ──────────",
  "2026-10-07T14:11:40.0000000Z ",
  "2026-10-07T14:11:40.0000000Z     Error: expect(locator).toHaveText(expected) failed",
  "2026-10-07T14:11:40.0000000Z ",
  '2026-10-07T14:11:40.0000000Z     Expected: "$12.35"',
  '2026-10-07T14:11:40.0000000Z     Received: "$12.34"',
  "2026-10-07T14:11:40.0000000Z ",
  "2026-10-07T14:11:40.0000000Z       46 |     await page.getByRole('button', { name: 'Refund' }).click();",
  "2026-10-07T14:11:40.0000000Z       47 |     const total = page.getByTestId('refund-total');",
  "2026-10-07T14:11:40.0000000Z     > 48 |     await expect(total).toHaveText('$12.35');",
  "2026-10-07T14:11:40.0000000Z          |                         ^",
  "2026-10-07T14:11:40.0000000Z ",
  "2026-10-07T14:11:40.0000000Z         at e2e/refunds.spec.ts:48:25",
  "2026-10-07T14:11:41.0000000Z ",
  "2026-10-07T14:11:41.0000000Z   1 failed",
  "2026-10-07T14:11:41.0000000Z     [chromium] › refunds.spec.ts:31:3 › partial refund rounds to the cent",
  "2026-10-07T14:11:41.0000000Z   1 flaky",
  "2026-10-07T14:11:41.0000000Z     [chromium] › cart.spec.ts:88:5 › applies a gift card after a coupon",
  "2026-10-07T14:11:41.0000000Z   210 passed (9.4m)",
  "2026-10-07T14:11:42.0000000Z ##[error]Process completed with exit code 1.",
].join("\n");

const DEMO_OTHER_LOGS: Record<number, string[]> = {
  9102: [
    "##[group]Run npx size-limit",
    "npx size-limit",
    "##[endgroup]",
    "  dist/main.js",
    "  Size limit: 300 kB",
    "  Size:       312.4 kB with all dependencies, minified and gzipped",
    "",
    "##[error]dist/main.js is 12.4 kB over its 300 kB limit",
    "##[error]Process completed with exit code 1.",
  ],
  9103: [
    "##[group]Run npm audit --audit-level=high",
    "npm audit --audit-level=high",
    "##[endgroup]",
    "# npm audit report",
    "",
    "image-size  <1.2.1",
    "Severity: high",
    "Denial of service via a crafted image - https://github.com/advisories/GHSA-m5qc-5hw7-8vg7",
    "fix available via `npm audit fix`",
    "node_modules/image-size",
    "",
    "1 high severity vulnerability",
    "",
    "##[error]npm audit found 1 high severity vulnerability (image-size <1.2.1)",
    "##[error]Process completed with exit code 1.",
  ],
};

export function demoAnnotations(jobId: number): Annotation[] {
  return jobId === DEMO_FAILING_JOB_ID ? DEMO_ANNOTATIONS : [];
}

export function demoLog(jobId: number): string {
  if (jobId === DEMO_FAILING_JOB_ID) {
    return DEMO_LOG;
  }
  const lines = DEMO_OTHER_LOGS[jobId] ?? ["##[group]Run checks", "##[endgroup]", "All good."];
  return lines.map((line) => `2026-10-07T14:10:00.0000000Z ${line}`).join("\n");
}
