/**
 * Demo Mode: an in-memory stand-in for the Multica API with fictional sample
 * data, good enough to explore every command and take Store screenshots.
 * Mutations (status changes, comments, new issues) persist only while the
 * command stays open.
 */
import type {
  Agent,
  AgentTask,
  Comment,
  CreateIssueInput,
  InboxItem,
  Issue,
  IssueStatus,
  Label,
  Member,
  Priority,
  Project,
  Runtime,
  Squad,
  StatusCategory,
  User,
  Workspace,
} from "./types";

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

// People & workspaces

const ME: User = { id: "user-alex", name: "Alex Rivera", email: "alex@example.com", avatar_url: null };

const WORKSPACES: Workspace[] = [
  { id: "ws-acme", name: "Acme", slug: "acme", issue_prefix: "ACME" },
  { id: "ws-personal", name: "Personal", slug: "personal", issue_prefix: "ME" },
  { id: "ws-oss", name: "Open Source", slug: "open-source", issue_prefix: "OSS" },
];

const MEMBERS: Member[] = [
  { id: "m-alex", user_id: ME.id, role: "owner", name: ME.name, email: ME.email, avatar_url: null },
  { id: "m-priya", user_id: "user-priya", role: "admin", name: "Priya Natarajan", email: "priya@example.com" },
  { id: "m-sam", user_id: "user-sam", role: "member", name: "Sam Okafor", email: "sam@example.com" },
  { id: "m-mei", user_id: "user-mei", role: "member", name: "Mei Lin", email: "mei@example.com" },
];

// Agents, runtimes, squads

const RUNTIMES: Runtime[] = [
  {
    id: "rt-mbp",
    name: "alex-mbp",
    custom_name: "Alex's MacBook Pro",
    runtime_mode: "local",
    provider: "claude",
    status: "online",
    device_info: "macOS 26 · arm64",
    owner_id: ME.id,
    last_seen_at: ago(0.2),
  },
  {
    id: "rt-build",
    name: "build-box-01",
    runtime_mode: "local",
    provider: "codex",
    status: "online",
    device_info: "Ubuntu 24.04 · x86_64",
    owner_id: "user-priya",
    last_seen_at: ago(0.5),
  },
  {
    id: "rt-studio",
    name: "priya-studio",
    custom_name: "Priya's Mac Studio",
    runtime_mode: "local",
    provider: "cursor",
    status: "offline",
    device_info: "macOS 26 · arm64",
    owner_id: "user-priya",
    last_seen_at: ago(60 * 26),
  },
];

const AGENTS: Agent[] = [
  {
    id: "agent-octo",
    name: "Octo",
    description: "Full-stack generalist. Owns API and infra work.",
    status: "working",
    runtime_id: "rt-mbp",
    runtime_availability: "online",
    avatar_url: "emoji:🐙",
    model: "claude-opus-5-5",
    owner_id: ME.id,
    max_concurrent_tasks: 3,
  },
  {
    id: "agent-fox",
    name: "Fox",
    description: "Backend and data migrations.",
    status: "working",
    runtime_id: "rt-build",
    runtime_availability: "online",
    avatar_url: "emoji:🦊",
    model: "gpt-5-codex",
    owner_id: "user-priya",
    max_concurrent_tasks: 2,
  },
  {
    id: "agent-owl",
    name: "Owl",
    description: "Frontend polish, accessibility, and design QA.",
    status: "idle",
    runtime_id: "rt-mbp",
    runtime_availability: "online",
    avatar_url: "emoji:🦉",
    model: "claude-sonnet-5-5",
    owner_id: ME.id,
    max_concurrent_tasks: 2,
  },
  {
    id: "agent-bee",
    name: "Bee",
    description: "Triage, docs, and small fixes.",
    status: "offline",
    runtime_id: "rt-studio",
    runtime_availability: "offline",
    avatar_url: "emoji:🐝",
    model: "cursor-agent",
    owner_id: "user-priya",
    max_concurrent_tasks: 1,
  },
];

const SQUADS: Squad[] = [
  {
    id: "squad-platform",
    name: "Platform Squad",
    description: "Octo leads; Fox and Bee pick up the rest.",
    avatar_url: "emoji:🧱",
    leader_id: "agent-octo",
    member_count: 3,
  },
];

const PROJECTS: Project[] = [
  { id: "proj-checkout", title: "Checkout v2", icon: "🛒", status: "in_progress" },
  { id: "proj-platform", title: "Platform Hardening", icon: "🛡️", status: "in_progress" },
  { id: "proj-growth", title: "Growth Experiments", icon: "📈", status: "planned" },
];

const LABELS: Record<string, Label> = {
  backend: { id: "label-backend", name: "backend", color: "#3B82F6" },
  frontend: { id: "label-frontend", name: "frontend", color: "#A855F7" },
  bug: { id: "label-bug", name: "bug", color: "#EF4444" },
  infra: { id: "label-infra", name: "infra", color: "#F59E0B" },
};

const BUILT_IN_STATUSES: [string, string, StatusCategory][] = [
  ["backlog", "Backlog", "unstarted"],
  ["todo", "Todo", "unstarted"],
  ["in_progress", "In Progress", "started"],
  ["in_review", "In Review", "started"],
  ["blocked", "Blocked", "started"],
  ["done", "Done", "done"],
  ["cancelled", "Cancelled", "closed"],
];

function statusesFor(workspaceId: string): IssueStatus[] {
  return BUILT_IN_STATUSES.map(([key, name, category], position) => ({
    id: `${workspaceId}-status-${key}`,
    key,
    name,
    category,
    is_system: true,
    position,
  }));
}

const categoryOf = (status: string) => BUILT_IN_STATUSES.find(([key]) => key === status)?.[2] ?? "unstarted";

// Issues

interface IssueSeed {
  number: number;
  title: string;
  status: string;
  priority: Priority;
  assignee?: [Issue["assignee_type"], string];
  creator?: [Issue["creator_type"], string];
  labels?: (keyof typeof LABELS)[];
  project?: string;
  updatedMinutesAgo: number;
  description?: string;
}

function makeIssue(workspace: Workspace, seed: IssueSeed): Issue {
  const [assigneeType, assigneeId] = seed.assignee ?? [null, null];
  const [creatorType, creatorId] = seed.creator ?? ["member", ME.id];
  return {
    id: `${workspace.id}-issue-${seed.number}`,
    workspace_id: workspace.id,
    number: seed.number,
    identifier: `${workspace.issue_prefix}-${seed.number}`,
    title: seed.title,
    description: seed.description ?? null,
    status: seed.status,
    status_category: categoryOf(seed.status),
    priority: seed.priority,
    assignee_type: assigneeType,
    assignee_id: assigneeId,
    creator_type: creatorType,
    creator_id: creatorId,
    project_id: seed.project ?? null,
    created_at: ago(seed.updatedMinutesAgo + 60 * 24 * 3),
    updated_at: ago(seed.updatedMinutesAgo),
    last_activity_at: ago(seed.updatedMinutesAgo),
    labels: seed.labels?.map((name) => LABELS[name]) ?? [],
  };
}

const ACME_SEEDS: IssueSeed[] = [
  {
    number: 142,
    title: "Rate-limit the public search endpoint",
    status: "in_progress",
    priority: "high",
    assignee: ["agent", "agent-octo"],
    labels: ["backend", "infra"],
    project: "proj-platform",
    updatedMinutesAgo: 4,
    description: [
      "Search traffic from a handful of scrapers is spiking p95 latency for everyone.",
      "",
      "## Acceptance criteria",
      "",
      "- [x] Token-bucket limiter keyed by API key, falling back to IP",
      "- [x] `429` responses include `Retry-After`",
      "- [ ] Limits configurable per plan",
      "- [ ] Dashboard panel for rejected requests",
      "",
      "> Keep the limiter in the edge middleware so it runs before auth.",
    ].join("\n"),
  },
  {
    number: 141,
    title: "Migrate billing webhooks to the new queue",
    status: "in_review",
    priority: "urgent",
    assignee: ["agent", "agent-fox"],
    labels: ["backend"],
    project: "proj-checkout",
    updatedMinutesAgo: 22,
  },
  {
    number: 140,
    title: "Cache avatar thumbnails at the edge",
    status: "in_progress",
    priority: "medium",
    assignee: ["member", ME.id],
    labels: ["infra"],
    updatedMinutesAgo: 48,
  },
  {
    number: 139,
    title: "Flaky checkout e2e test on Safari",
    status: "todo",
    priority: "medium",
    assignee: ["member", "user-sam"],
    labels: ["bug", "frontend"],
    project: "proj-checkout",
    updatedMinutesAgo: 75,
  },
  {
    number: 138,
    title: "Add dark mode to the settings page",
    status: "todo",
    priority: "low",
    assignee: ["agent", "agent-owl"],
    labels: ["frontend"],
    updatedMinutesAgo: 130,
  },
  {
    number: 137,
    title: "Dashboard charts render blank for new teams",
    status: "blocked",
    priority: "high",
    assignee: ["member", "user-priya"],
    labels: ["bug", "frontend"],
    updatedMinutesAgo: 190,
  },
  {
    number: 136,
    title: "Write copy for the onboarding email sequence",
    status: "todo",
    priority: "none",
    assignee: ["member", ME.id],
    project: "proj-growth",
    updatedMinutesAgo: 260,
  },
  {
    number: 135,
    title: "Upgrade the web app to React 19",
    status: "backlog",
    priority: "medium",
    labels: ["frontend"],
    updatedMinutesAgo: 60 * 20,
  },
  {
    number: 134,
    title: "Audit and remove stale feature flags",
    status: "backlog",
    priority: "low",
    assignee: ["agent", "agent-fox"],
    updatedMinutesAgo: 60 * 30,
  },
  {
    number: 131,
    title: "CSV export drops non-ASCII characters",
    status: "done",
    priority: "high",
    assignee: ["agent", "agent-octo"],
    labels: ["bug", "backend"],
    updatedMinutesAgo: 60 * 5,
  },
  {
    number: 129,
    title: "Investigate moving search to a managed index",
    status: "cancelled",
    priority: "low",
    updatedMinutesAgo: 60 * 50,
  },
];

const PERSONAL_SEEDS: IssueSeed[] = [
  {
    number: 12,
    title: "Renew domain and move DNS",
    status: "todo",
    priority: "high",
    assignee: ["member", ME.id],
    updatedMinutesAgo: 90,
  },
  {
    number: 11,
    title: "Port dotfiles to the new machine",
    status: "in_progress",
    priority: "medium",
    assignee: ["agent", "agent-owl"],
    updatedMinutesAgo: 300,
  },
  {
    number: 9,
    title: "Back up photo library",
    status: "backlog",
    priority: "low",
    updatedMinutesAgo: 60 * 40,
  },
];

const OSS_SEEDS: IssueSeed[] = [
  {
    number: 58,
    title: "Support Node 24 in CI matrix",
    status: "in_review",
    priority: "medium",
    assignee: ["agent", "agent-octo"],
    updatedMinutesAgo: 35,
  },
  {
    number: 57,
    title: "Docs: clarify config precedence",
    status: "todo",
    priority: "low",
    assignee: ["agent", "agent-bee"],
    updatedMinutesAgo: 60 * 8,
  },
];

const SEEDS: Record<string, IssueSeed[]> = {
  "ws-acme": ACME_SEEDS,
  "ws-personal": PERSONAL_SEEDS,
  "ws-oss": OSS_SEEDS,
};

const issues: Issue[] = WORKSPACES.flatMap((w) => SEEDS[w.id].map((seed) => makeIssue(w, seed)));

// Comments, runs, inbox

const comments: Comment[] = [
  {
    id: "c-1",
    issue_id: "ws-acme-issue-142",
    author_type: "member",
    author_id: ME.id,
    content: "Octo, can you take this? Start with the search route; we can generalize after.",
    type: "comment",
    created_at: ago(95),
    updated_at: ago(95),
  },
  {
    id: "c-2",
    issue_id: "ws-acme-issue-142",
    author_type: "agent",
    author_id: "agent-octo",
    content:
      "On it. Plan:\n\n1. Token bucket in `middleware/ratelimit.ts`, keyed by API key\n2. Redis-backed counters with a 1s refill\n3. `Retry-After` on every 429\n\nFirst two are pushed to `octo/search-rate-limit`.",
    type: "comment",
    created_at: ago(60),
    updated_at: ago(60),
  },
  {
    id: "c-3",
    issue_id: "ws-acme-issue-142",
    author_type: "member",
    author_id: "user-priya",
    content: "Looks good. Free plan should be 10 req/s, Pro 50.",
    type: "comment",
    created_at: ago(12),
    updated_at: ago(12),
  },
];

interface TaskSeed {
  agent: string;
  issueNumber: number;
  status: AgentTask["status"];
  startedMinutesAgo: number;
  durationMinutes?: number;
  error?: string;
}

const TASK_SEEDS: TaskSeed[] = [
  { agent: "agent-octo", issueNumber: 142, status: "running", startedMinutesAgo: 18 },
  { agent: "agent-octo", issueNumber: 131, status: "completed", startedMinutesAgo: 60 * 6, durationMinutes: 41 },
  { agent: "agent-octo", issueNumber: 140, status: "completed", startedMinutesAgo: 60 * 9, durationMinutes: 12 },
  {
    agent: "agent-octo",
    issueNumber: 137,
    status: "failed",
    startedMinutesAgo: 60 * 11,
    durationMinutes: 7,
    error: "Tests failed: charts.spec.ts (3 failures)",
  },
  { agent: "agent-fox", issueNumber: 141, status: "running", startedMinutesAgo: 9 },
  { agent: "agent-fox", issueNumber: 134, status: "queued", startedMinutesAgo: 1 },
  { agent: "agent-owl", issueNumber: 138, status: "completed", startedMinutesAgo: 60 * 3, durationMinutes: 26 },
];

const tasks: AgentTask[] = TASK_SEEDS.map((t, i) => {
  const issueId = `ws-acme-issue-${t.issueNumber}`;
  const started = t.status === "queued" ? null : ago(t.startedMinutesAgo);
  return {
    id: `task-${i}`,
    agent_id: t.agent,
    runtime_id: AGENTS.find((a) => a.id === t.agent)!.runtime_id,
    issue_id: issueId,
    issue_identifier: `ACME-${t.issueNumber}`,
    status: t.status,
    created_at: ago(t.startedMinutesAgo + 1),
    started_at: started,
    completed_at: t.durationMinutes ? ago(t.startedMinutesAgo - t.durationMinutes) : null,
    error: t.error ?? null,
  };
});

const inbox: (InboxItem & { workspace_id: string })[] = [
  {
    id: "in-1",
    workspace_id: "ws-acme",
    type: "agent_blocked",
    severity: "action_required",
    issue_id: "ws-acme-issue-141",
    title: "Fox needs a review on ACME-141",
    body: "Migrate billing webhooks to the new queue",
    read: false,
    archived: false,
    created_at: ago(22),
    actor_type: "agent",
    actor_id: "agent-fox",
  },
  {
    id: "in-2",
    workspace_id: "ws-acme",
    type: "mentioned",
    severity: "attention",
    issue_id: "ws-acme-issue-142",
    title: "Priya mentioned you on ACME-142",
    body: "Free plan should be 10 req/s, Pro 50.",
    read: false,
    archived: false,
    created_at: ago(12),
    actor_type: "member",
    actor_id: "user-priya",
  },
  {
    id: "in-3",
    workspace_id: "ws-acme",
    type: "quick_create_done",
    severity: "info",
    issue_id: "ws-acme-issue-139",
    title: "Owl filed ACME-139",
    body: "Flaky checkout e2e test on Safari",
    read: false,
    archived: false,
    created_at: ago(75),
    actor_type: "agent",
    actor_id: "agent-owl",
  },
  {
    id: "in-4",
    workspace_id: "ws-acme",
    type: "task_completed",
    severity: "info",
    issue_id: "ws-acme-issue-131",
    title: "Octo completed ACME-131",
    body: "CSV export drops non-ASCII characters",
    read: true,
    archived: false,
    created_at: ago(60 * 5),
    actor_type: "agent",
    actor_id: "agent-octo",
  },
  {
    id: "in-5",
    workspace_id: "ws-acme",
    type: "task_failed",
    severity: "attention",
    issue_id: "ws-acme-issue-137",
    title: "Octo's run on ACME-137 failed",
    body: "Tests failed: charts.spec.ts (3 failures)",
    read: true,
    archived: false,
    created_at: ago(60 * 11),
    actor_type: "agent",
    actor_id: "agent-octo",
  },
  {
    id: "in-6",
    workspace_id: "ws-personal",
    type: "issue_assigned",
    severity: "info",
    issue_id: "ws-personal-issue-12",
    title: "You were assigned ME-12",
    body: "Renew domain and move DNS",
    read: false,
    archived: false,
    created_at: ago(90),
    actor_type: "member",
    actor_id: ME.id,
  },
];

// Router

export class DemoNotFoundError extends Error {}

interface DemoRequest {
  method: string;
  path: string;
  workspaceId?: string;
  query: URLSearchParams;
  body?: unknown;
}

function findIssue(workspaceId: string | undefined, idOrIdentifier: string): Issue {
  const issue = issues.find(
    (i) =>
      (!workspaceId || i.workspace_id === workspaceId) && (i.id === idOrIdentifier || i.identifier === idOrIdentifier),
  );
  if (!issue) throw new DemoNotFoundError(`Issue ${idOrIdentifier} not found`);
  return issue;
}

function sortByUpdated(list: Issue[]): Issue[] {
  return [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function listIssues(workspaceId: string, query: URLSearchParams) {
  const categories = query.get("status_category")?.split(",");
  const assigneeId = query.get("assignee_id");
  const list = issues.filter(
    (i) =>
      i.workspace_id === workspaceId &&
      (!categories || categories.includes(categoryOf(i.status))) &&
      (!assigneeId || i.assignee_id === assigneeId),
  );
  return { issues: sortByUpdated(list), total: list.length };
}

function searchIssues(workspaceId: string, q: string) {
  const needle = q.toLowerCase();
  const matches = issues.filter(
    (i) =>
      i.workspace_id === workspaceId &&
      (i.title.toLowerCase().includes(needle) ||
        i.identifier.toLowerCase().includes(needle) ||
        i.description?.toLowerCase().includes(needle)),
  );
  return { issues: sortByUpdated(matches) };
}

function createIssue(workspaceId: string, input: CreateIssueInput): Issue {
  const workspace = WORKSPACES.find((w) => w.id === workspaceId) ?? WORKSPACES[0];
  const number = Math.max(0, ...issues.filter((i) => i.workspace_id === workspaceId).map((i) => i.number)) + 1;
  const issue = makeIssue(workspace, {
    number,
    title: input.title,
    description: input.description,
    status: input.status ?? "todo",
    priority: input.priority ?? "none",
    assignee: input.assignee_type && input.assignee_id ? [input.assignee_type, input.assignee_id] : undefined,
    project: input.project_id,
    updatedMinutesAgo: 0,
  });
  issue.updated_at = issue.created_at = issue.last_activity_at = new Date().toISOString();
  issues.unshift(issue);
  return issue;
}

function route(req: DemoRequest): unknown {
  const { method, path, workspaceId = WORKSPACES[0].id, query, body } = req;
  const parts = path
    .replace(/^\/api\//, "")
    .split("/")
    .map(decodeURIComponent);
  const [resource, id, sub] = parts;

  switch (`${method} ${resource}`) {
    case "GET me":
      return ME;
    case "GET workspaces":
      return id && sub === "members" ? MEMBERS : WORKSPACES;
    case "GET issue-statuses":
      return { statuses: statusesFor(workspaceId) };
    case "GET projects":
      return { projects: PROJECTS };
    case "GET agents":
      if (id && sub === "tasks") return tasks.filter((t) => t.agent_id === id);
      return AGENTS;
    case "GET runtimes":
      return RUNTIMES;
    case "GET squads":
      return SQUADS;
    case "GET issues":
      if (id === "search") return searchIssues(workspaceId, query.get("q") ?? "");
      if (id && sub === "comments") return comments.filter((c) => c.issue_id === findIssue(workspaceId, id).id);
      if (id) return findIssue(workspaceId, id);
      return listIssues(workspaceId, query);
    case "POST issues": {
      if (id === "quick-create") return { task_id: `task-demo-${Date.now()}` };
      if (id && sub === "comments") {
        const issue = findIssue(workspaceId, id);
        const comment: Comment = {
          id: `c-${Date.now()}`,
          issue_id: issue.id,
          author_type: "member",
          author_id: ME.id,
          content: (body as { content: string }).content,
          type: "comment",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        comments.push(comment);
        return comment;
      }
      return createIssue(workspaceId, body as CreateIssueInput);
    }
    case "PUT issues": {
      const issue = findIssue(workspaceId, id);
      Object.assign(issue, body, { updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() });
      issue.status_category = categoryOf(issue.status);
      return issue;
    }
    case "GET inbox":
      if (id === "unread-summary") {
        return WORKSPACES.map((w) => ({
          workspace_id: w.id,
          count: inbox.filter((i) => i.workspace_id === w.id && !i.read && !i.archived).length,
        })).filter((row) => row.count > 0);
      }
      return inbox.filter((i) => i.workspace_id === workspaceId);
    case "POST inbox": {
      if (id === "mark-all-read") {
        inbox.filter((i) => i.workspace_id === workspaceId).forEach((i) => (i.read = true));
        return {};
      }
      const item = inbox.find((i) => i.id === id);
      if (!item) throw new DemoNotFoundError("Notification not found");
      if (sub === "read" || sub === "unread") item.read = sub === "read";
      if (sub === "archive") item.archived = true;
      return item;
    }
  }
  throw new DemoNotFoundError(`Demo Mode has no sample data for ${method} ${path}`);
}

/** Resolves like the real API, after a short delay so loading states look natural. */
export async function demoRequest<T>(req: DemoRequest): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return structuredClone(route(req)) as T;
}
