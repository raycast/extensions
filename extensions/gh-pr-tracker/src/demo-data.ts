import type { PRWithActivity, GHUser } from "./types";

// ─── Fake users ──────────────────────────────────────────────────────────────

const alice: GHUser = { login: "alice-dev", avatar_url: "" };
const bob: GHUser = { login: "bob-reviewer", avatar_url: "" };
const carol: GHUser = { login: "carol-eng", avatar_url: "" };
const dave: GHUser = { login: "dave-ops", avatar_url: "" };

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

// ─── PR 1: Reviews & code comments ──────────────────────────────────────────

const pr1: PRWithActivity = {
  number: 142,
  title: "Add user authentication middleware",
  html_url: "https://github.example.com/acme/backend/pull/142",
  created_at: hoursAgo(48),
  updated_at: hoursAgo(1),
  user: alice,
  comments: 4,
  state: "open",
  repo: "acme/backend",
  reviews: [
    {
      id: 9001,
      user: bob,
      state: "CHANGES_REQUESTED",
      body: "A few things to address before we can merge — see inline comments.",
      submitted_at: hoursAgo(3),
      html_url: "https://github.example.com/acme/backend/pull/142#pullrequestreview-9001",
    },
    {
      id: 9002,
      user: carol,
      state: "APPROVED",
      body: "Looks great overall! Just one minor nit.",
      submitted_at: hoursAgo(1),
      html_url: "https://github.example.com/acme/backend/pull/142#pullrequestreview-9002",
    },
  ],
  reviewComments: [
    {
      id: 5001,
      pull_request_review_id: 9001,
      user: bob,
      body: "This should validate the token expiry before proceeding.",
      path: "src/middleware/auth.ts",
      line: 42,
      original_line: 42,
      diff_hunk:
        "@@ -40,6 +40,10 @@\n+  const token = req.headers.authorization;\n+  if (!token) return res.status(401).send();",
      created_at: hoursAgo(3),
      updated_at: hoursAgo(3),
      html_url: "https://github.example.com/acme/backend/pull/142#discussion_r5001",
    },
    {
      id: 5002,
      pull_request_review_id: 9001,
      in_reply_to_id: 5001,
      user: alice,
      body: "Good catch — added the expiry check in the latest commit.",
      path: "src/middleware/auth.ts",
      line: 42,
      original_line: 42,
      diff_hunk:
        "@@ -40,6 +40,10 @@\n+  const token = req.headers.authorization;\n+  if (!token) return res.status(401).send();",
      created_at: hoursAgo(2),
      updated_at: hoursAgo(2),
      html_url: "https://github.example.com/acme/backend/pull/142#discussion_r5002",
    },
  ],
  issueComments: [
    {
      id: 7001,
      user: carol,
      body: "Should we also add rate limiting to this endpoint?",
      created_at: hoursAgo(2),
      updated_at: hoursAgo(2),
      html_url: "https://github.example.com/acme/backend/pull/142#issuecomment-7001",
    },
  ],
  events: [],
  commits: [],
};

// ─── PR 2: Commits, force push & labels ─────────────────────────────────────

const pr2: PRWithActivity = {
  number: 87,
  title: "Migrate database to PostgreSQL",
  html_url: "https://github.example.com/acme/infra/pull/87",
  created_at: hoursAgo(24),
  updated_at: hoursAgo(0.5),
  user: dave,
  comments: 1,
  state: "open",
  repo: "acme/infra",
  reviews: [],
  reviewComments: [],
  issueComments: [],
  events: [
    {
      id: 3001,
      event: "labeled",
      created_at: hoursAgo(4),
      actor: bob,
      label: { id: 10, name: "breaking-change", color: "e11d48" },
    },
    {
      id: 3002,
      event: "unlabeled",
      created_at: hoursAgo(2),
      actor: bob,
      label: { id: 11, name: "WIP", color: "fbbf24" },
    },
    {
      id: 3003,
      event: "labeled",
      created_at: hoursAgo(1.5),
      actor: carol,
      label: { id: 12, name: "ready-for-review", color: "22c55e" },
    },
    {
      id: 3004,
      event: "head_ref_force_pushed",
      created_at: hoursAgo(0.5),
      actor: dave,
    },
  ],
  commits: [
    {
      sha: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      commit: {
        message: "Add migration scripts for user table",
        author: { name: "Dave Ops", date: hoursAgo(6) },
      },
      author: dave,
      html_url: "https://github.example.com/acme/infra/commit/a1b2c3d",
    },
    {
      sha: "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
      commit: {
        message: "Fix connection pooling config\n\nIncreased max connections to 20.",
        author: { name: "Dave Ops", date: hoursAgo(1) },
      },
      author: dave,
      html_url: "https://github.example.com/acme/infra/commit/f6e5d4c",
    },
  ],
};

// ─── PR 3: New PR opened + general comment ──────────────────────────────────

const pr3: PRWithActivity = {
  number: 256,
  title: "Fix dark mode toggle on settings page",
  html_url: "https://github.example.com/acme/frontend/pull/256",
  created_at: hoursAgo(0.25),
  updated_at: hoursAgo(0.1),
  user: carol,
  comments: 1,
  state: "open",
  repo: "acme/frontend",
  reviews: [
    {
      id: 9010,
      user: alice,
      state: "COMMENTED",
      body: "Nice fix! Tested locally and the toggle works correctly now.",
      submitted_at: hoursAgo(0.1),
      html_url: "https://github.example.com/acme/frontend/pull/256#pullrequestreview-9010",
    },
  ],
  reviewComments: [],
  issueComments: [
    {
      id: 7010,
      user: dave,
      body: "Can we also fix the animation flicker? It's a one-liner in the same file.",
      created_at: hoursAgo(0.15),
      updated_at: hoursAgo(0.15),
      html_url: "https://github.example.com/acme/frontend/pull/256#issuecomment-7010",
    },
  ],
  events: [
    {
      id: 3010,
      event: "labeled",
      created_at: hoursAgo(0.2),
      actor: carol,
      label: { id: 13, name: "bug", color: "d73a4a" },
    },
  ],
  commits: [
    {
      sha: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      commit: {
        message: "Fix dark mode toggle state persistence",
        author: { name: "Carol Eng", date: hoursAgo(0.25) },
      },
      author: carol,
      html_url: "https://github.example.com/acme/frontend/commit/deadbeef",
    },
  ],
};

export function getDemoPRs(): PRWithActivity[] {
  return [pr1, pr2, pr3];
}
