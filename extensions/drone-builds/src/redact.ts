import type {
  BuildStatus,
  DroneBuild,
  DroneBuildDetail,
  DroneCron,
  DroneFeed,
  DroneLogLine,
  DroneRepo,
  DroneStage,
  DroneStep,
  DroneUser,
} from "./drone";

/**
 * Deterministic anonymizer for screenshots / Raycast Store publishing.
 *
 * Goal: same real value always maps to the same fake one, both within a single
 * render and across API calls, so:
 *  - `getMe().login` and `build.author_login` remain comparable for the isMine filter
 *  - the same repo always renders under the same fake slug across menu / list / cron views
 *  - the user can flip Demo Mode on, take a coherent set of screenshots, flip off
 *
 * Strategy: lightweight FNV-1a hash → index into a small curated list. No state, no I/O.
 */

const REPO_NAMES = [
  "acme/api",
  "acme/web",
  "acme/worker",
  "acme/dashboard",
  "acme/cli",
  "acme/billing",
  "acme/notifications",
  "acme/search",
] as const;

const PEOPLE: Array<{ login: string; name: string }> = [
  { login: "alice", name: "Alice Doe" },
  { login: "bob", name: "Bob Roe" },
  { login: "carol", name: "Carol Lin" },
  { login: "dave", name: "Dave Hsu" },
  { login: "eve", name: "Eve Sato" },
  { login: "frank", name: "Frank Park" },
];

const BRANCHES = [
  "main",
  "develop",
  "feature/payments",
  "feature/onboarding",
  "release/1.4",
  "hotfix/auth",
  "refactor/db-pool",
] as const;

const COMMITS = [
  "Refactor login middleware",
  "Fix race in queue worker",
  "Add pagination to list endpoint",
  "Bump dependencies for security patch",
  "Cache invalidation on user update",
  "Switch hashing to argon2id",
  "Document new feature flag",
  "Restore dropped index on orders.user_id",
  "Tighten request timeout on third-party calls",
  "Migrate notifications to async pipeline",
] as const;

const CRON_NAMES = [
  "nightly-build",
  "weekly-deploy",
  "hourly-sync",
  "release-prep",
  "lint-everything",
  "rebuild-docs",
  "rotate-credentials",
] as const;

const EVENTS = ["push", "pull_request", "cron", "promote", "custom"];

/** Cheap stable hash → non-negative int. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

function pick<T>(seed: string, arr: ReadonlyArray<T>): T {
  return arr[hash(seed) % arr.length] as T;
}

function fakeSlug(originalSlug: string): {
  slug: string;
  namespace: string;
  name: string;
} {
  const fake = pick(originalSlug, REPO_NAMES);
  const [namespace, name] = fake.split("/", 2);
  return { slug: fake, namespace, name };
}

function fakePerson(seed: string): {
  login: string;
  name: string;
  email: string;
} {
  if (!seed)
    return { login: "alice", name: "Alice Doe", email: "alice@example.com" };
  const p = pick(seed, PEOPLE);
  return { login: p.login, name: p.name, email: `${p.login}@example.com` };
}

function fakeBranch(seed: string): string {
  if (!seed) return "main";
  return pick(seed, BRANCHES);
}

function fakeMessage(seed: string): string {
  if (!seed) return "(no message)";
  return pick(seed, COMMITS);
}

function fakeCronName(seed: string): string {
  if (!seed) return "nightly-build";
  return pick(seed, CRON_NAMES);
}

function fakeLink(slug: string, suffix = ""): string {
  return `https://drone.example.com/${slug}${suffix}`;
}

export function redactUser(u: DroneUser): DroneUser {
  const p = fakePerson(u.login || u.email || String(u.id));
  return { ...u, login: p.login, email: p.email, avatar_url: undefined };
}

export function redactBuild(b: DroneBuild, slug: string): DroneBuild {
  const author = fakePerson(b.author_login || b.author_email || "anon");
  const sender = b.sender ? fakePerson(b.sender) : author;
  const target = fakeBranch(b.target || b.ref || slug);
  return {
    ...b,
    sender: sender.login,
    author_login: author.login,
    author_name: author.name,
    author_email: author.email,
    message: fakeMessage(b.message || String(b.id)),
    ref: `refs/heads/${target}`,
    source: target,
    target,
    event: EVENTS.includes(b.event) ? b.event : pick(String(b.id), EVENTS),
    link: fakeLink(slug, `/${b.number}`),
  };
}

export function redactRepo(r: DroneRepo): DroneRepo {
  const f = fakeSlug(r.slug);
  return {
    ...r,
    namespace: f.namespace,
    name: f.name,
    slug: f.slug,
    link: fakeLink(f.slug),
    default_branch: r.default_branch ? fakeBranch(r.slug) : r.default_branch,
  };
}

export function redactCron(c: DroneCron, fakeSlugStr: string): DroneCron {
  return {
    ...c,
    name: fakeCronName(c.name + ":" + fakeSlugStr),
    branch: c.branch ? fakeBranch(c.branch + ":" + fakeSlugStr) : c.branch,
    target: c.target ? fakeBranch(c.target + ":" + fakeSlugStr) : c.target,
  };
}

export function redactFeed(items: DroneFeed[]): DroneFeed[] {
  return items.map((f) => {
    const fs = fakeSlug(f.slug);
    return {
      ...f,
      namespace: fs.namespace,
      name: fs.name,
      slug: fs.slug,
      build: f.build ? redactBuild(f.build, fs.slug) : f.build,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Synthetic generators                                                       */
/*                                                                             */
/*  Used by drone.ts in Demo Mode for endpoints whose path includes a slug —   */
/*  we can't hit the real Drone API with a fake slug, so we bypass HTTP and    */
/*  return curated synthetic data instead. Keeps screenshots coherent without  */
/*  faking the API server.                                                     */
/* -------------------------------------------------------------------------- */

export const syntheticRepos: DroneRepo[] = REPO_NAMES.map((slug, i) => {
  const [namespace, name] = slug.split("/", 2);
  return {
    id: 1000 + i,
    namespace,
    name,
    slug,
    link: fakeLink(slug),
    default_branch: "main",
    active: true,
  };
});

const CRON_EXPRS = [
  "0 0 * * *",
  "0 9 * * 1",
  "*/30 * * * *",
  "0 12 1 * *",
  "0 4 * * 0",
];

export function syntheticCrons(slug: string): DroneCron[] {
  const repoId = 1000 + (hash(slug) % REPO_NAMES.length);
  return CRON_NAMES.slice(0, 4).map((name, i) => ({
    id: 5000 + (hash(slug + name) % 999),
    repo_id: repoId,
    name,
    expr: CRON_EXPRS[i] ?? CRON_EXPRS[0],
    next: Math.floor(Date.now() / 1000) + 3600 * (i + 1),
    prev: Math.floor(Date.now() / 1000) - 3600 * (24 - i * 2),
    event: "cron",
    branch: "main",
    target: "main",
    disabled: i === 3,
  }));
}

export function syntheticBuild(slug: string, name: string): DroneBuild {
  const num = 100 + (hash(slug + name) % 899);
  return {
    id: 90000 + (hash(slug + name) % 9999),
    number: num,
    status: "pending",
    event: "cron",
    sender: "alice",
    author_login: "alice",
    author_name: "Alice Doe",
    author_email: "alice@example.com",
    started: Math.floor(Date.now() / 1000),
    finished: 0,
    message: `Triggered ${name} via Raycast`,
    ref: "refs/heads/main",
    source: "main",
    target: "main",
    link: fakeLink(slug, `/${num}`),
  };
}

const SYNTHETIC_STEPS: Array<{
  name: string;
  status: BuildStatus;
  durSec: number;
}> = [
  { name: "clone", status: "success", durSec: 5 },
  { name: "install", status: "success", durSec: 90 },
  { name: "lint", status: "success", durSec: 12 },
  { name: "test", status: "success", durSec: 170 },
  { name: "build", status: "success", durSec: 40 },
];

export function syntheticBuildDetail(
  slug: string,
  num: number,
): DroneBuildDetail {
  const now = Math.floor(Date.now() / 1000);
  let cursor = now - 350;
  const steps: DroneStep[] = SYNTHETIC_STEPS.map((s, i) => {
    const started = cursor;
    cursor += s.durSec;
    return {
      id: 10000 + i,
      step_id: 10000 + i,
      number: i + 1,
      name: s.name,
      status: s.status,
      exit_code: s.status === "success" ? 0 : 1,
      started,
      stopped: cursor,
    };
  });
  const stage: DroneStage = {
    id: 9000,
    build_id: 90000,
    number: 1,
    name: "default",
    kind: "pipeline",
    type: "docker",
    status: "success",
    exit_code: 0,
    started: steps[0].started,
    stopped: steps[steps.length - 1].stopped,
    os: "linux",
    arch: "amd64",
    steps,
  };
  return {
    id: 90000 + (hash(slug + String(num)) % 9999),
    number: num,
    status: "success",
    event: "push",
    sender: "alice",
    author_login: "alice",
    author_name: "Alice Doe",
    author_email: "alice@example.com",
    started: stage.started,
    finished: stage.stopped,
    message: "Refactor login middleware",
    ref: "refs/heads/main",
    source: "main",
    target: "main",
    link: fakeLink(slug, `/${num}`),
    stages: [stage],
  };
}

export function syntheticLogs(): DroneLogLine[] {
  const t0 = Math.floor(Date.now() / 1000) - 200;
  const lines = [
    "+ git clone --depth=50 https://drone.example.com/acme/api .",
    "Cloning into '.'...",
    "+ git checkout main",
    "Switched to branch 'main'",
    "+ npm ci",
    "added 312 packages in 18s",
    "+ npm test",
    "PASS  src/login.test.ts",
    "PASS  src/queue.test.ts",
    "PASS  src/billing.test.ts",
    "Test Suites: 3 passed, 3 total",
    "Tests:       42 passed, 42 total",
    "Snapshots:   0 total",
    "Time:        12.345 s",
    "Ran all test suites.",
  ];
  return lines.map((out, i) => ({ pos: i, time: t0 + i, out: out + "\n" }));
}
