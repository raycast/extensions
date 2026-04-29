# OpenCode Raycast Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Raycast extension that lets you search OpenCode projects and sessions, see live status, and launch/resume sessions in iTerm2.

**Architecture:** SDK-first approach using `@opencode-ai/sdk` to connect to running OpenCode servers discovered via process scanning. Two Raycast commands (Search Projects, Search Sessions) with iTerm2 integration for terminal actions.

**Tech Stack:** TypeScript, React (Raycast), `@opencode-ai/sdk`, `@raycast/api`, `@raycast/utils`

**Design doc:** `docs/plans/2026-04-28-raycast-extension-design.md`

---

### Task 1: Install SDK dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the OpenCode SDK**

Run from `opencode/opencode/`:
```bash
npm install @opencode-ai/sdk
```

**Step 2: Verify installation**

Run: `npm ls @opencode-ai/sdk`
Expected: Shows the installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @opencode-ai/sdk dependency"
```

---

### Task 2: Server discovery module

**Files:**
- Create: `src/lib/discovery.ts`

**Step 1: Create the discovery module**

This module finds running OpenCode servers by parsing process output and checking ports.

```typescript
import { execSync } from "child_process";
import { createOpencodeClient } from "@opencode-ai/sdk/client";

export interface DiscoveredServer {
  baseUrl: string;
  version: string;
  pid: number;
}

let cache: { servers: DiscoveredServer[]; timestamp: number } | null = null;
const CACHE_TTL = 5000; // 5 seconds

/**
 * Find opencode processes and extract their listening ports from process arguments
 * or via lsof.
 */
function findOpencodePorts(): Array<{ pid: number; port: number }> {
  try {
    // Get opencode processes
    const ps = execSync("ps aux", { encoding: "utf-8" });
    const lines = ps.split("\n").filter((line) => line.includes("opencode") && !line.includes("grep"));

    const results: Array<{ pid: number; port: number }> = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[1], 10);
      if (isNaN(pid)) continue;

      // Try to extract port from --port argument
      const portFlagIndex = line.indexOf("--port");
      if (portFlagIndex !== -1) {
        const afterFlag = line.substring(portFlagIndex + 6).trim();
        const port = parseInt(afterFlag.split(/\s+/)[0], 10);
        if (!isNaN(port)) {
          results.push({ pid, port });
          continue;
        }
      }

      // Fallback: use lsof to find listening port for this process
      try {
        const lsof = execSync(`lsof -p ${pid} -iTCP -sTCP:LISTEN -P -Fn 2>/dev/null`, {
          encoding: "utf-8",
        });
        const portMatch = lsof.match(/n\*?:?(\d+)$/m) || lsof.match(/n127\.0\.0\.1:(\d+)/m);
        if (portMatch) {
          results.push({ pid, port: parseInt(portMatch[1], 10) });
        }
      } catch {
        // Process might not have a listening port
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Discover all running OpenCode servers.
 * Results are cached for 5 seconds.
 */
export async function discoverServers(): Promise<DiscoveredServer[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.servers;
  }

  const ports = findOpencodePorts();
  const servers: DiscoveredServer[] = [];

  // Deduplicate by port
  const seen = new Set<number>();

  for (const { pid, port } of ports) {
    if (seen.has(port)) continue;
    seen.add(port);

    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      const client = createOpencodeClient({ baseUrl });
      const health = await client.global.health();
      if (health.data?.healthy) {
        servers.push({
          baseUrl,
          version: health.data.version || "unknown",
          pid,
        });
      }
    } catch {
      // Server not responding, skip
    }
  }

  cache = { servers, timestamp: Date.now() };
  return servers;
}

/** Clear the discovery cache (useful after launching a new server). */
export function clearDiscoveryCache(): void {
  cache = null;
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: No errors (or only unrelated Raycast type errors)

**Step 3: Commit**

```bash
git add src/lib/discovery.ts
git commit -m "feat: add server discovery module"
```

---

### Task 3: Client pool module

**Files:**
- Create: `src/lib/clients.ts`

**Step 1: Create the client pool**

This module manages SDK clients and merges data from multiple servers.

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk/client";
import { discoverServers, type DiscoveredServer } from "./discovery";

type OpencodeClient = ReturnType<typeof createOpencodeClient>;

export interface ConnectedServer {
  server: DiscoveredServer;
  client: OpencodeClient;
}

/**
 * Get SDK clients for all discovered servers.
 */
export async function getClients(): Promise<ConnectedServer[]> {
  const servers = await discoverServers();
  return servers.map((server) => ({
    server,
    client: createOpencodeClient({ baseUrl: server.baseUrl }),
  }));
}

/**
 * Get the first available client (for operations that only need one server).
 * Returns null if no servers are running.
 */
export async function getFirstClient(): Promise<ConnectedServer | null> {
  const clients = await getClients();
  return clients[0] ?? null;
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/clients.ts
git commit -m "feat: add client pool module"
```

---

### Task 4: iTerm2 terminal integration

**Files:**
- Create: `src/lib/terminal.ts`

**Step 1: Create the terminal module**

Uses AppleScript to control iTerm2.

```typescript
import { runAppleScript } from "@raycast/utils";

/**
 * Open a new iTerm2 tab, cd to directory, and run a command.
 */
export async function openInITerm(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "iTerm2"
      activate
      tell current window
        create tab with default profile
        tell current session
          write text "cd ${escapeForAppleScript(directory)} && ${escapeForAppleScript(command)}"
        end tell
      end tell
    end tell
  `);
}

/**
 * Open opencode in a directory.
 */
export async function openOpenCode(directory: string): Promise<void> {
  await openInITerm(directory, "opencode");
}

/**
 * Resume a specific opencode session.
 */
export async function resumeSession(directory: string, sessionId: string): Promise<void> {
  await openInITerm(directory, `opencode -s ${sessionId}`);
}

function escapeForAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/terminal.ts
git commit -m "feat: add iTerm2 terminal integration"
```

---

### Task 5: React hooks for data fetching

**Files:**
- Create: `src/lib/hooks.ts`

**Step 1: Create the hooks module**

Raycast-idiomatic hooks for fetching projects, sessions, and status.

```typescript
import { useCachedPromise } from "@raycast/utils";
import { getClients, getFirstClient } from "./clients";
import type { ConnectedServer } from "./clients";

/**
 * Fetch projects from all connected servers.
 */
export function useProjects() {
  return useCachedPromise(async () => {
    const clients = await getClients();
    if (clients.length === 0) return [];

    const results = await Promise.allSettled(
      clients.map(async (c) => {
        const res = await c.client.project.list();
        return (res.data ?? []).map((p) => ({ ...p, server: c.server }));
      }),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);
  });
}

/**
 * Fetch sessions from all connected servers.
 */
export function useSessions() {
  return useCachedPromise(async () => {
    const clients = await getClients();
    if (clients.length === 0) return [];

    const results = await Promise.allSettled(
      clients.map(async (c) => {
        const res = await c.client.session.list();
        return (res.data ?? []).map((s) => ({ ...s, server: c.server }));
      }),
    );

    // Deduplicate by session ID, keep most recent
    const sessionsMap = new Map<string, any>();
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const session of result.value) {
        const existing = sessionsMap.get(session.id);
        if (!existing || session.time_updated > existing.time_updated) {
          sessionsMap.set(session.id, session);
        }
      }
    }

    return Array.from(sessionsMap.values()).sort(
      (a, b) => b.time_updated - a.time_updated,
    );
  });
}

/**
 * Fetch session status from all connected servers.
 */
export function useSessionStatus() {
  return useCachedPromise(
    async () => {
      const clients = await getClients();
      if (clients.length === 0) return {};

      const results = await Promise.allSettled(
        clients.map(async (c) => {
          const res = await c.client.session.status();
          return res.data ?? {};
        }),
      );

      // Merge all status maps
      const merged: Record<string, any> = {};
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        Object.assign(merged, result.value);
      }
      return merged;
    },
    [],
    { keepPreviousData: true },
  );
}

/**
 * Fetch todos for a specific session.
 */
export function useSessionTodos(sessionId: string) {
  return useCachedPromise(async () => {
    const connected = await getFirstClient();
    if (!connected) return [];

    const res = await connected.client.session.todos({
      path: { id: sessionId },
    });
    return res.data ?? [];
  });
}

/**
 * Fetch messages for a specific session.
 */
export function useSessionMessages(sessionId: string) {
  return useCachedPromise(async () => {
    const connected = await getFirstClient();
    if (!connected) return [];

    const res = await connected.client.session.messages({
      path: { id: sessionId },
    });
    return (res.data ?? []).slice(0, 10); // Last 10 messages
  });
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/hooks.ts
git commit -m "feat: add data fetching hooks"
```

---

### Task 6: Update package.json with both commands

**Files:**
- Modify: `package.json`

**Step 1: Update the commands array**

Replace the `commands` field in `package.json`:

```json
{
  "commands": [
    {
      "name": "search-projects",
      "title": "Search Projects",
      "description": "Search and open OpenCode projects",
      "mode": "view"
    },
    {
      "name": "search-sessions",
      "title": "Search Sessions",
      "description": "Search and resume OpenCode sessions",
      "mode": "view"
    }
  ]
}
```

**Step 2: Rename the command file**

Rename `src/list-projects.ts` to `src/search-projects.tsx` (Raycast needs `.tsx` for view commands).

Delete the old file and create the new one in the next task.

**Step 3: Commit**

```bash
git rm src/list-projects.ts
git add package.json
git commit -m "feat: update commands config for search-projects and search-sessions"
```

---

### Task 7: Search Projects command

**Files:**
- Create: `src/search-projects.tsx`

**Step 1: Implement the command**

```tsx
import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useProjects, useSessionStatus } from "./lib/hooks";
import { openOpenCode } from "./lib/terminal";

export default function SearchProjects() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: statusMap, isLoading: statusLoading } = useSessionStatus();

  const isLoading = projectsLoading || statusLoading;

  // Count active sessions per project
  function activeSessionCount(projectId: string): number {
    if (!statusMap) return 0;
    return Object.values(statusMap).filter(
      (s: any) => s.projectId === projectId && s.status === "running",
    ).length;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {!isLoading && (!projects || projects.length === 0) ? (
        <List.EmptyView
          title="No OpenCode servers found"
          description="Start OpenCode in a terminal to see projects here."
          icon={Icon.Terminal}
        />
      ) : (
        projects?.map((project) => {
          const activeCount = activeSessionCount(project.id);
          return (
            <List.Item
              key={project.id}
              title={project.name || project.worktree.split("/").pop() || "Unknown"}
              subtitle={project.worktree}
              icon={Icon.Folder}
              accessories={[
                ...(activeCount > 0
                  ? [{ tag: { value: `${activeCount} active`, color: Color.Green } }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open in iTerm"
                    icon={Icon.Terminal}
                    onAction={() => openOpenCode(project.worktree)}
                  />
                  <Action.Push
                    title="View Sessions"
                    icon={Icon.List}
                    target={<ProjectSessions projectId={project.id} directory={project.worktree} />}
                  />
                  <Action.CopyToClipboard title="Copy Path" content={project.worktree} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function ProjectSessions({ projectId, directory }: { projectId: string; directory: string }) {
  // Filtered session list — implemented in Task 8 as a shared component
  return (
    <List searchBarPlaceholder="Search sessions...">
      <List.EmptyView title="No sessions" description="Sessions for this project will appear here." />
    </List>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/search-projects.tsx
git commit -m "feat: implement Search Projects command"
```

---

### Task 8: Search Sessions command

**Files:**
- Create: `src/search-sessions.tsx`

**Step 1: Implement the command**

```tsx
import { ActionPanel, Action, List, Detail, Icon, Color } from "@raycast/api";
import { useSessions, useSessionStatus, useSessionTodos, useSessionMessages } from "./lib/hooks";
import { resumeSession } from "./lib/terminal";

function statusColor(status: string): Color {
  switch (status) {
    case "running":
      return Color.Green;
    case "waiting":
      return Color.Yellow;
    default:
      return Color.SecondaryText;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "running":
      return "Running";
    case "waiting":
      return "Waiting";
    default:
      return "Idle";
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString();
}

export default function SearchSessions() {
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: statusMap, isLoading: statusLoading } = useSessionStatus();

  const isLoading = sessionsLoading || statusLoading;

  function getStatus(sessionId: string): string {
    if (!statusMap) return "idle";
    const status = (statusMap as Record<string, any>)[sessionId];
    return status?.status ?? "idle";
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      {!isLoading && (!sessions || sessions.length === 0) ? (
        <List.EmptyView
          title="No sessions found"
          description="Start OpenCode in a terminal to see sessions here."
          icon={Icon.Terminal}
        />
      ) : (
        sessions?.map((session) => {
          const status = getStatus(session.id);
          return (
            <List.Item
              key={session.id}
              title={session.title || "Untitled"}
              subtitle={session.directory}
              icon={Icon.Message}
              accessories={[
                { tag: { value: statusLabel(status), color: statusColor(status) } },
                { text: formatTime(session.time_updated) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Resume in iTerm"
                    icon={Icon.Terminal}
                    onAction={() => resumeSession(session.directory, session.id)}
                  />
                  <Action.Push
                    title="View Activity"
                    icon={Icon.Eye}
                    target={<SessionActivity sessionId={session.id} title={session.title} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Session ID"
                    content={session.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function SessionActivity({ sessionId, title }: { sessionId: string; title: string }) {
  const { data: todos } = useSessionTodos(sessionId);
  const { data: messages } = useSessionMessages(sessionId);

  const todoSection = todos?.length
    ? todos
        .map((t: any) => {
          const icon = t.status === "completed" ? "✅" : t.status === "in_progress" ? "🔄" : "⬜";
          return `${icon} ${t.content}`;
        })
        .join("\n")
    : "_No tasks_";

  const messageSection = messages?.length
    ? messages
        .map((m: any) => {
          const role = m.info?.role === "user" ? "👤" : "🤖";
          const text =
            m.parts?.[0]?.type === "text"
              ? m.parts[0].text?.substring(0, 200)
              : `[${m.parts?.[0]?.type ?? "unknown"}]`;
          return `${role} ${text}`;
        })
        .join("\n\n---\n\n")
    : "_No messages_";

  const markdown = `# ${title || "Session"}

## Tasks
${todoSection}

## Recent Activity
${messageSection}`;

  return <Detail markdown={markdown} />;
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/search-sessions.tsx
git commit -m "feat: implement Search Sessions command with activity view"
```

---

### Task 9: Wire up ProjectSessions in search-projects

**Files:**
- Modify: `src/search-projects.tsx`

**Step 1: Import useSessions and resumeSession, implement ProjectSessions**

Replace the placeholder `ProjectSessions` component with a real implementation that filters sessions by project ID and reuses the session list item pattern from `search-sessions.tsx`.

Consider extracting shared session list rendering into a `src/components/SessionListItem.tsx` if the duplication is significant.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/search-projects.tsx src/components/
git commit -m "feat: wire up project sessions sub-view"
```

---

### Task 10: Manual testing and polish

**Step 1: Install dependencies**

Run from `opencode/opencode/`:
```bash
npm install
```

**Step 2: Start development mode**

Run: `npm run dev`

This opens the extension in Raycast for live testing.

**Step 3: Test Search Projects**

- Verify projects appear with correct names and paths
- Verify active session count badges
- Test "Open in iTerm" action
- Test "View Sessions" push navigation

**Step 4: Test Search Sessions**

- Verify sessions appear sorted by last updated
- Verify status badges (running/idle)
- Test "Resume in iTerm" action
- Test "View Activity" detail view
- Verify todo list and messages render correctly

**Step 5: Test edge cases**

- No servers running → empty state
- Server goes down during use → graceful degradation

**Step 6: Run linter**

Run: `npm run lint`
Fix any issues.

**Step 7: Commit**

```bash
git add -A
git commit -m "fix: polish and lint fixes from manual testing"
```
