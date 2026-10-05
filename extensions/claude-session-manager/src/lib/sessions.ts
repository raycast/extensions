import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// homedir() is stable across processes; tmpdir() resolves via $TMPDIR, which can
// differ between a dev shell and Raycast's own sandboxed process.
const DEMO_MODE_MARKER = join(homedir(), ".claude-sessions-demo");

export interface ClaudeSession {
  id: string;
  filePath: string;
  cwd: string;
  projectName: string;
  gitBranch: string | null;
  title: string | null;
  isWorktree: boolean;
  lastActiveAt: Date;
  mtimeMs: number;
  mockExchange?: { lastUserText: string | null; lastAssistantText: string | null };
}

const PROJECTS_DIR = join(homedir(), ".claude", "projects");

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function getMockSessions(): ClaudeSession[] {
  return [
    {
      id: "demo-1",
      filePath: "mock://demo-1",
      cwd: "/Users/demo/Projects/billing-service",
      projectName: "billing-service",
      gitBranch: "fix/invoice-rounding",
      title: "Fix invoice rounding for annual plans",
      isWorktree: false,
      lastActiveAt: minutesAgo(4),
      mtimeMs: minutesAgo(4).getTime(),
      mockExchange: {
        lastUserText: "Can you also handle the currency conversion edge case?",
        lastAssistantText:
          "Done — added a rounding guard in `computeInvoiceTotal` for non-USD currencies and a regression test.",
      },
    },
    {
      id: "demo-2",
      filePath: "mock://demo-2",
      cwd: "/Users/demo/Projects/marketing-site",
      projectName: "marketing-site",
      gitBranch: "main",
      title: "Update pricing page copy",
      isWorktree: false,
      lastActiveAt: minutesAgo(52),
      mtimeMs: minutesAgo(52).getTime(),
      mockExchange: {
        lastUserText: "Looks good, ship it.",
        lastAssistantText: "Merged the copy changes and opened a PR for review.",
      },
    },
    {
      id: "demo-3",
      filePath: "mock://demo-3",
      cwd: "/Users/demo/Projects/infra/.claude-worktrees/review-pr-482",
      projectName: "review-pr-482",
      gitBranch: "review/pr-482",
      title: "Review Terraform module for shared VPC",
      isWorktree: true,
      lastActiveAt: minutesAgo(180),
      mtimeMs: minutesAgo(180).getTime(),
      mockExchange: {
        lastUserText: "Any concerns before I approve this?",
        lastAssistantText: "One nit: the subnet CIDR overlaps with staging. Left a comment on the PR.",
      },
    },
    {
      id: "demo-4",
      filePath: "mock://demo-4",
      cwd: "/Users/demo/Projects/mobile-app",
      projectName: "mobile-app",
      gitBranch: "feature/offline-sync",
      title: "Add offline sync queue",
      isWorktree: false,
      lastActiveAt: minutesAgo(1440),
      mtimeMs: minutesAgo(1440).getTime(),
      mockExchange: {
        lastUserText: "What happens if the queue fills up while offline?",
        lastAssistantText: "It now drops the oldest low-priority events first and logs a warning — see `SyncQueue.ts`.",
      },
    },
  ];
}

function formatTitle(aiTitle: string): string {
  const spaced = aiTitle.replace(/[-_]/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function parseSessionMeta(filePath: string): { cwd: string; gitBranch: string | null; title: string | null } | null {
  const lines = readFileSync(filePath, "utf-8").split("\n");

  let cwd: string | null = null;
  let gitBranch: string | null = null;
  let title: string | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    let parsed: { cwd?: unknown; gitBranch?: unknown; type?: unknown; aiTitle?: unknown };
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    if (cwd === null && typeof parsed.cwd === "string") {
      cwd = parsed.cwd;
      gitBranch = typeof parsed.gitBranch === "string" ? parsed.gitBranch : null;
    }
    if (parsed.type === "ai-title" && typeof parsed.aiTitle === "string" && parsed.aiTitle.trim()) {
      title = formatTitle(parsed.aiTitle);
    }
  }

  return cwd === null ? null : { cwd, gitBranch, title };
}

export function listSessions(): ClaudeSession[] {
  if (existsSync(DEMO_MODE_MARKER)) {
    return getMockSessions();
  }

  let projectDirs: string[];
  try {
    projectDirs = readdirSync(PROJECTS_DIR);
  } catch {
    return [];
  }

  const sessions: ClaudeSession[] = [];

  for (const projectDir of projectDirs) {
    const projectPath = join(PROJECTS_DIR, projectDir);
    let sessionFiles: string[];
    try {
      sessionFiles = readdirSync(projectPath).filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }

    for (const sessionFile of sessionFiles) {
      const filePath = join(projectPath, sessionFile);
      try {
        const stat = statSync(filePath);
        if (stat.size === 0) continue;

        const parsed = parseSessionMeta(filePath);
        if (!parsed) continue;

        const cwd = parsed.cwd;
        const isWorktree = cwd.includes(".claude-worktrees");
        const projectName = cwd.split("/").filter(Boolean).pop() ?? cwd;

        sessions.push({
          id: sessionFile.replace(/\.jsonl$/, ""),
          filePath,
          cwd,
          projectName,
          gitBranch: parsed.gitBranch,
          title: parsed.title,
          isWorktree,
          lastActiveAt: stat.mtime,
          mtimeMs: stat.mtimeMs,
        });
      } catch {
        continue;
      }
    }
  }

  return sessions.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
}
