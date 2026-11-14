/**
 * Fabricated data for screenshots and demos.
 *
 * Store listings need every state visible at once — a stalled pull request, a
 * reply owed for three weeks, a SAML refusal — and real accounts don't oblige
 * on demand. They also leak organization names, colleagues, and private repo
 * titles into public images.
 *
 * Everything here is invented. The org is `northwind`, a fictional company
 * used in Microsoft sample databases since the nineties; the logins are
 * likewise made up.
 *
 * **Double-gated on purpose.** Demo mode requires `environment.isDevelopment`
 * *and* an explicit opt-in flag. A published build can't enter it even if the
 * flag is somehow set, because the development check fails first.
 */
import { Cache, LocalStorage, environment } from "@raycast/api";

import type { ActivityEvent } from "./activity";
import type { PRDetail, PullRequest, RepoRef, Viewer } from "./types";

const DEMO_KEY = "gh-review.demo-mode";

/** Whether the running build is even allowed to consider demo mode. */
export function demoModeAvailable(): boolean {
  return environment.isDevelopment;
}

let cached: boolean | undefined;

/** Whether demo data should be served instead of GitHub's. */
export async function isDemoMode(): Promise<boolean> {
  if (!demoModeAvailable()) return false;
  if (cached !== undefined) return cached;
  cached = (await LocalStorage.getItem<string>(DEMO_KEY)) === "1";
  return cached;
}

export async function setDemoMode(on: boolean): Promise<void> {
  cached = on;
  if (on) await LocalStorage.setItem(DEMO_KEY, "1");
  else await LocalStorage.removeItem(DEMO_KEY);

  // Several hooks cache on a key that doesn't vary with demo mode — useViewer
  // and the activity inbox take no arguments at all. Without this, the first
  // paint after toggling shows the *previous* mode's cached data: your real
  // login, your real repository names. That is precisely the frame a
  // screenshot would capture, so drop the cache on every toggle, both ways.
  new Cache().clear();
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const DEMO_VIEWER: Viewer = {
  login: "avery-dev",
  orgs: ["northwind", "northwind-labs"],
  teams: ["northwind/platform", "northwind/api", "northwind-labs/research"],
};

/** Timestamps are relative to now, so the ageing bands stay correct forever. */
const ago = (days: number, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();

function pr(overrides: Partial<PullRequest> & Pick<PullRequest, "number" | "title" | "repository">): PullRequest {
  return {
    url: `https://github.com/${overrides.repository}/pull/${overrides.number}`,
    isDraft: false,
    createdAt: ago(4),
    updatedAt: ago(1),
    author: "avery-dev",
    additions: 84,
    deletions: 21,
    changedFiles: 6,
    reviewDecision: "",
    labels: [],
    assignees: [],
    reviewers: [],
    comments: 0,
    threads: 0,
    unresolved: 0,
    awaitingReply: 0,
    latestReplier: "",
    awaitingUrl: "",
    awaitingSince: "",
    lastActivity: overrides.updatedAt ?? ago(1),
    newSince: false,
    ...overrides,
  };
}

/** One deliberately varied set per category, covering every visual state. */
const BY_CATEGORY: Record<string, PullRequest[]> = {
  "review-requested": [
    pr({
      repository: "northwind/checkout",
      number: 4821,
      title: "Retry failed webhook deliveries with exponential backoff",
      author: "jules-b",
      createdAt: ago(1),
      updatedAt: ago(0, 3),
      lastActivity: ago(0, 3),
      additions: 312,
      deletions: 47,
      changedFiles: 11,
      reviewDecision: "REVIEW_REQUIRED",
      labels: [{ name: "backend", color: "1d76db" }],
      reviewers: ["avery-dev", "@platform"],
      comments: 2,
      newSince: true,
    }),
    pr({
      repository: "northwind/design-system",
      number: 918,
      title: "Add dark-mode tokens to the button primitives",
      author: "priya-k",
      createdAt: ago(9),
      updatedAt: ago(8),
      lastActivity: ago(8),
      additions: 96,
      deletions: 12,
      changedFiles: 4,
      reviewDecision: "REVIEW_REQUIRED",
      labels: [
        { name: "design", color: "d4c5f9" },
        { name: "good first review", color: "0e8a16" },
      ],
      reviewers: ["avery-dev"],
      comments: 5,
      threads: 3,
      unresolved: 1,
    }),
    pr({
      repository: "northwind-labs/inference",
      number: 233,
      title: "Cache embeddings between batches",
      author: "sam-oh",
      createdAt: ago(40),
      updatedAt: ago(33),
      lastActivity: ago(33),
      additions: 1204,
      deletions: 380,
      changedFiles: 27,
      reviewDecision: "CHANGES_REQUESTED",
      labels: [{ name: "performance", color: "fbca04" }],
      reviewers: ["avery-dev"],
      comments: 14,
      threads: 9,
      unresolved: 4,
    }),
  ],
  "team-review": [
    pr({
      repository: "northwind/api",
      number: 2077,
      title: "Deprecate the v1 orders endpoint",
      author: "jules-b",
      createdAt: ago(3),
      updatedAt: ago(2),
      lastActivity: ago(2),
      additions: 41,
      deletions: 260,
      changedFiles: 9,
      labels: [{ name: "breaking", color: "b60205" }],
      reviewers: ["@api"],
      comments: 3,
    }),
  ],
  "my-prs": [
    pr({
      repository: "northwind/checkout",
      number: 4830,
      title: "Split the payment reconciler into its own worker",
      createdAt: ago(2),
      updatedAt: ago(0, 5),
      lastActivity: ago(0, 5),
      additions: 528,
      deletions: 96,
      changedFiles: 18,
      reviewDecision: "APPROVED",
      labels: [{ name: "backend", color: "1d76db" }],
      reviewers: ["priya-k", "jules-b"],
      comments: 6,
      threads: 4,
      unresolved: 0,
      newSince: true,
    }),
    pr({
      repository: "northwind/docs",
      number: 145,
      title: "Document the new rate-limit headers",
      createdAt: ago(6),
      updatedAt: ago(5),
      lastActivity: ago(5),
      isDraft: true,
      additions: 62,
      deletions: 3,
      changedFiles: 2,
    }),
  ],
  "awaiting-reply": [
    pr({
      repository: "northwind/checkout",
      number: 4802,
      title: "Move idempotency keys into Redis",
      createdAt: ago(24),
      updatedAt: ago(18),
      lastActivity: ago(18),
      additions: 187,
      deletions: 64,
      changedFiles: 8,
      reviewDecision: "CHANGES_REQUESTED",
      labels: [{ name: "backend", color: "1d76db" }],
      comments: 11,
      threads: 6,
      unresolved: 3,
      awaitingReply: 2,
      latestReplier: "priya-k",
      awaitingUrl: "https://github.com/northwind/checkout/pull/4802#discussion_r991122",
      awaitingSince: ago(18),
      newSince: true,
    }),
    pr({
      repository: "northwind/api",
      number: 2044,
      title: "Return 429 with Retry-After on burst limits",
      createdAt: ago(70),
      updatedAt: ago(41),
      lastActivity: ago(41),
      additions: 73,
      deletions: 18,
      changedFiles: 3,
      comments: 8,
      threads: 5,
      unresolved: 2,
      awaitingReply: 1,
      latestReplier: "sam-oh",
      awaitingUrl: "https://github.com/northwind/api/pull/2044#issuecomment-778899",
      awaitingSince: ago(41),
    }),
  ],
  watching: [
    pr({
      repository: "northwind/design-system",
      number: 921,
      title: "Bump the icon set to 3.2",
      author: "priya-k",
      createdAt: ago(0, 6),
      updatedAt: ago(0, 6),
      lastActivity: ago(0, 6),
      additions: 2140,
      deletions: 1980,
      changedFiles: 63,
      labels: [{ name: "chore", color: "cfd3d7" }],
      newSince: true,
    }),
  ],
};

/** Demo results for a category, or a small generic set for a saved filter. */
export function demoPullRequests(categoryId: string): PullRequest[] {
  return BY_CATEGORY[categoryId] ?? BY_CATEGORY["review-requested"].slice(0, 2);
}

export function demoRepos(): RepoRef[] {
  return [
    { owner: "northwind", name: "checkout" },
    { owner: "northwind", name: "api" },
    { owner: "northwind", name: "design-system" },
    { owner: "northwind", name: "docs" },
    { owner: "northwind-labs", name: "inference" },
    { owner: "northwind-labs", name: "datasets" },
  ];
}

/** Inbox entries mirroring the demo pull requests, for the Activity command. */
export function demoActivity(): ActivityEvent[] {
  return [
    {
      id: "demo-1",
      kind: "awaiting-reply",
      prKey: "northwind/checkout#4802",
      repository: "northwind/checkout",
      number: 4802,
      title: "Move idempotency keys into Redis",
      url: "https://github.com/northwind/checkout/pull/4802",
      commentUrl: "https://github.com/northwind/checkout/pull/4802#discussion_r991122",
      actor: "priya-k",
      summary: "@priya-k replied · 2 threads awaiting you",
      at: ago(0, 2),
      read: false,
      notified: true,
    },
    {
      id: "demo-2",
      kind: "review-requested",
      prKey: "northwind/checkout#4821",
      repository: "northwind/checkout",
      number: 4821,
      title: "Retry failed webhook deliveries with exponential backoff",
      url: "https://github.com/northwind/checkout/pull/4821",
      actor: "jules-b",
      summary: "Needs your review",
      at: ago(0, 3),
      read: false,
      notified: true,
    },
    {
      id: "demo-3",
      kind: "my-pr-activity",
      prKey: "northwind/checkout#4830",
      repository: "northwind/checkout",
      number: 4830,
      title: "Split the payment reconciler into its own worker",
      url: "https://github.com/northwind/checkout/pull/4830",
      actor: "priya-k",
      summary: "Approved",
      at: ago(0, 5),
      read: true,
      notified: false,
    },
    {
      id: "demo-4",
      kind: "review-requested",
      prKey: "northwind/design-system#918",
      repository: "northwind/design-system",
      number: 918,
      title: "Add dark-mode tokens to the button primitives",
      url: "https://github.com/northwind/design-system/pull/918",
      actor: "priya-k",
      summary: "Updated · 5 comments",
      at: ago(1, 4),
      read: true,
      notified: false,
    },
  ];
}

export function demoDetail(): PRDetail {
  return {
    id: "PR_demo",
    body: "Idempotency keys currently live in Postgres, which puts a write on the hot path for every retry. This moves them to Redis with a 24-hour TTL and falls back to Postgres on a cache miss.",
    reviews: [
      {
        author: "priya-k",
        state: "CHANGES_REQUESTED",
        body: "Solid direction. My worry is the fallback path — if Redis is down we'd double-charge rather than fail closed. Can we make the miss path explicit?",
        createdAt: ago(18),
      },
    ],
    comments: [
      {
        author: "jules-b",
        body: "Ran this against the replay fixtures and it held up at 4k req/s.",
        createdAt: ago(20),
      },
    ],
    threads: [
      {
        id: "T_demo1",
        url: "https://github.com/northwind/checkout/pull/4802#discussion_r991122",
        path: "internal/idempotency/store.go",
        line: 88,
        resolved: false,
        outdated: false,
        comments: [
          {
            author: "priya-k",
            body: "What happens if Redis evicts this before the retry lands?",
            createdAt: ago(18),
          },
        ],
      },
      {
        id: "T_demo2",
        url: "https://github.com/northwind/checkout/pull/4802#discussion_r991090",
        path: "internal/idempotency/store.go",
        line: 34,
        resolved: true,
        outdated: false,
        comments: [{ author: "jules-b", body: "Nit: this could take a context.", createdAt: ago(21) }],
      },
    ],
    timeline: [
      { kind: "opened", actor: "avery-dev", at: ago(24) },
      { kind: "review-requested", actor: "avery-dev", at: ago(24), text: "@priya-k" },
      { kind: "comment", actor: "jules-b", at: ago(20), text: "Ran this against the replay fixtures at 4k req/s." },
      { kind: "review-changes", actor: "priya-k", at: ago(18), text: "Can we make the miss path explicit?" },
      { kind: "force-push", actor: "avery-dev", at: ago(19) },
      { kind: "label", actor: "jules-b", at: ago(22), text: "backend" },
    ],
  };
}
