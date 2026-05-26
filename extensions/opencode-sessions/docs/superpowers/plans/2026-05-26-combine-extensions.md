# Combine OpenCode Raycast Extensions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge two Raycast extensions (session inspector + session launcher) into one unified extension with content search, terminal integration, and liveness detection.

**Architecture:** The existing `opencode-sessions` extension is the base. We add `@opencode-ai/sdk` for activity data, a terminal module for opening/resuming sessions, and liveness detection via process scanning. The single "List Sessions" command becomes "Search Sessions" with dual-mode search (time-grouped browse + scored content search).

**Tech Stack:** TypeScript, React (Raycast API), SQLite, OpenCode SDK

---

### Task 1: Update package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update package.json with new dependencies, commands, and preferences**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "opencode-sessions",
  "title": "OpenCode Sessions",
  "description": "Browse, search, and manage your OpenCode sessions",
  "icon": "extension-icon.png",
  "author": "mike182uk",
  "contributors": [
    "mormubis"
  ],
  "platforms": [
    "macOS"
  ],
  "categories": [
    "Developer Tools"
  ],
  "license": "MIT",
  "commands": [
    {
      "name": "search-sessions",
      "title": "Search Sessions",
      "subtitle": "OpenCode",
      "description": "Find sessions by title or content, see active status, resume in terminal",
      "mode": "view"
    },
    {
      "name": "new-session",
      "title": "New Session",
      "subtitle": "OpenCode",
      "description": "Start a fresh OpenCode conversation in any project directory",
      "mode": "no-view",
      "arguments": [
        {
          "name": "directory",
          "type": "text",
          "placeholder": "Directory path",
          "required": false
        },
        {
          "name": "prompt",
          "type": "text",
          "placeholder": "Prompt",
          "required": false
        }
      ]
    }
  ],
  "preferences": [
    {
      "name": "databasePath",
      "type": "textfield",
      "required": false,
      "title": "Database Path",
      "description": "Override OpenCode database path (defaults to ~/.local/share/opencode/opencode.db)",
      "placeholder": "~/.local/share/opencode/opencode.db"
    },
    {
      "name": "terminal",
      "title": "Terminal",
      "description": "Terminal application to open OpenCode sessions in. Auto-detect picks the first running terminal.",
      "type": "dropdown",
      "required": false,
      "default": "auto",
      "data": [
        { "title": "Auto-detect", "value": "auto" },
        { "title": "iTerm2", "value": "iterm2" },
        { "title": "Terminal.app", "value": "terminal" },
        { "title": "Warp", "value": "warp" },
        { "title": "Ghostty", "value": "ghostty" },
        { "title": "Kitty", "value": "kitty" }
      ]
    }
  ],
  "dependencies": {
    "@opencode-ai/sdk": "^1.14.28",
    "@raycast/api": "^1.104.13",
    "@raycast/utils": "^1.17.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.0.4",
    "@types/node": "22.19.17",
    "@types/react": "19.0.10",
    "eslint": "^9.22.0",
    "prettier": "^3.5.3",
    "typescript": "^5.8.2"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "prepublishOnly": "echo \"\\n\\nIt seems like you are trying to publish the Raycast extension to npm.\\n\\nIf you did intend to publish it to npm, remove the \\`prepublishOnly\\` script and rerun \\`npm publish\\` again.\\nIf you wanted to publish it to the Raycast Store instead, use \\`npm run publish\\` instead.\\n\\n\" && exit 1",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

- [ ] **Step 2: Rename the entry point file**

Rename `src/index.tsx` to `src/search-sessions.tsx` to match the new command name.

- [ ] **Step 3: Install dependencies**

Run: `npm install`

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds (command name mismatch resolved by rename).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: update package.json with SDK, terminal, and new-session command"
```

---

### Task 2: Add terminal module

**Files:**
- Create: `src/lib/terminal.ts`

This is ported directly from the other extension. Handles terminal detection, opening new tabs, and focusing existing sessions.

- [ ] **Step 1: Create `src/lib/terminal.ts`**

```typescript
import { execSync } from "child_process";
import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function shellQuote(str: string): string {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

type TerminalId = "iterm2" | "terminal" | "warp" | "ghostty" | "kitty";

const terminalProcessNames: Record<TerminalId, string[]> = {
  iterm2: ["iTerm2"],
  kitty: ["kitty"],
  warp: ["Warp"],
  ghostty: ["Ghostty", "ghostty"],
  terminal: ["Terminal"],
};

const terminalPriority: TerminalId[] = ["iterm2", "kitty", "warp", "ghostty", "terminal"];

function detectTerminal(): TerminalId {
  try {
    const output = execSync("ps -eo comm= | sort -u", { encoding: "utf-8" });
    const running = new Set(output.split("\n").map((l) => l.trim().split("/").pop() ?? ""));

    for (const id of terminalPriority) {
      if (terminalProcessNames[id].some((name) => running.has(name))) {
        return id;
      }
    }
  } catch {
    // fallback
  }
  return "terminal";
}

function getTerminal(): TerminalId {
  const prefs = getPreferenceValues<Preferences>();
  const pref = prefs.terminal as string | undefined;
  if (pref && pref !== "auto" && pref in terminalProcessNames) return pref as TerminalId;
  return detectTerminal();
}

function findTtyForSession(sessionId: string): string | null {
  try {
    const output = execSync("ps aux", { encoding: "utf-8" });
    for (const line of output.split("\n")) {
      if (!line.includes(sessionId)) continue;
      const parts = line.trim().split(/\s+/);
      const tty = parts[6];
      if (tty && tty.startsWith("s")) {
        return `/dev/tty${tty}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// --- iTerm2 ---

async function focusITermByTty(tty: string): Promise<boolean> {
  const result = await runAppleScript(`
    tell application "iTerm2"
      tell current window
        repeat with i from 1 to (count of tabs)
          tell tab i
            tell current session
              if tty is "${esc(tty)}" then
                tell current window of application "iTerm2"
                  select tab i
                  if is hotkey window then
                    reveal hotkey window
                  end if
                end tell
                activate
                return "found"
              end if
            end tell
          end tell
        end repeat
      end tell
    end tell
    return "not_found"
  `);
  return result.trim() === "found";
}

async function openInITerm(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "iTerm2"
      activate
      tell current window
        create tab with default profile
        tell current session
          write text "cd ${esc(shellQuote(directory))} && ${esc(command)}"
        end tell
      end tell
    end tell
  `);
}

// --- Terminal.app ---

async function openInTerminalApp(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "Terminal"
      activate
      do script "cd ${esc(shellQuote(directory))} && ${esc(command)}"
    end tell
  `);
}

// --- Warp ---

async function openInWarp(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "Warp"
      activate
    end tell
    delay 0.3
    tell application "System Events"
      tell process "Warp"
        keystroke "t" using command down
        delay 0.3
        keystroke "cd ${esc(shellQuote(directory))} && ${esc(command)}"
        key code 36
      end tell
    end tell
  `);
}

// --- Ghostty ---

async function openInGhostty(directory: string, command: string): Promise<void> {
  await runAppleScript(`
    tell application "Ghostty"
      activate
    end tell
    delay 0.3
    tell application "System Events"
      tell process "Ghostty"
        keystroke "t" using command down
        delay 0.3
        keystroke "cd ${esc(shellQuote(directory))} && ${esc(command)}"
        key code 36
      end tell
    end tell
  `);
}

// --- Kitty ---

async function focusKittyByTty(tty: string): Promise<boolean> {
  try {
    const output = execSync("kitty @ ls 2>/dev/null", { encoding: "utf-8" });
    const windows = JSON.parse(output) as Array<{
      id: number;
      tabs: Array<{
        id: number;
        windows: Array<{ id: number; foreground_processes: Array<{ cwd: string; cmdline: string[] }> }>;
      }>;
    }>;
    for (const win of windows) {
      for (const tab of win.tabs) {
        for (const pane of tab.windows) {
          for (const proc of pane.foreground_processes) {
            if (proc.cmdline.some((arg) => arg.includes(tty.replace("/dev/", "")))) {
              execSync(`kitty @ focus-window --match id:${pane.id} 2>/dev/null`);
              return true;
            }
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function openInKitty(directory: string, command: string): Promise<void> {
  try {
    execSync(
      `kitty @ launch --type=tab --cwd=${shellQuote(directory)} -- sh -c ${shellQuote(`${command}; exec $SHELL`)}`,
      { encoding: "utf-8" },
    );
  } catch {
    await runAppleScript(`
      tell application "kitty"
        activate
      end tell
      delay 0.3
      tell application "System Events"
        tell process "kitty"
          keystroke "t" using command down
          delay 0.3
          keystroke "cd ${esc(shellQuote(directory))} && ${esc(command)}"
          key code 36
        end tell
      end tell
    `);
  }
}

// --- Public API ---

const openers: Record<TerminalId, (dir: string, cmd: string) => Promise<void>> = {
  iterm2: openInITerm,
  terminal: openInTerminalApp,
  warp: openInWarp,
  ghostty: openInGhostty,
  kitty: openInKitty,
};

export async function openOpenCode(directory: string, prompt?: string): Promise<void> {
  const terminal = getTerminal();
  const cmd = prompt ? `opencode --prompt ${shellQuote(prompt)}` : "opencode";
  return openers[terminal](directory, cmd);
}

export async function resumeSession(directory: string, sessionId: string, isOpen: boolean = false): Promise<void> {
  const cmd = `opencode -s ${shellQuote(sessionId)}`;
  const terminal = getTerminal();

  if (isOpen) {
    const tty = findTtyForSession(sessionId);
    if (tty) {
      let focused = false;
      if (terminal === "iterm2") focused = await focusITermByTty(tty);
      if (terminal === "kitty") focused = await focusKittyByTty(tty);
      if (focused) return;
    }
  }

  return openers[terminal](directory, cmd);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add terminal module for opening and resuming sessions"
```

---

### Task 3: Add SDK client module

**Files:**
- Create: `src/lib/clients.ts`

Manages a singleton OpenCode SDK client for fetching todos and messages.

- [ ] **Step 1: Create `src/lib/clients.ts`**

```typescript
import { execSync } from "child_process";
import { createOpencode, OpencodeClient } from "@opencode-ai/sdk/v2";

let instance: { client: OpencodeClient; server: { url: string; close(): void } } | null = null;
let initializing: Promise<OpencodeClient> | null = null;

/**
 * Ensure Homebrew paths are in PATH so `opencode` binary is found.
 * Raycast's Node.js environment has a minimal PATH.
 */
function ensurePath(): void {
  const current = process.env.PATH ?? "";
  const extraPaths = ["/opt/homebrew/bin", "/usr/local/bin"];

  try {
    const shellPath = execSync("zsh -ilc 'echo $PATH'", { encoding: "utf-8" }).trim();
    if (shellPath) {
      process.env.PATH = `${shellPath}:${current}`;
      return;
    }
  } catch {
    // Fallback to known paths
  }

  for (const p of extraPaths) {
    if (!current.includes(p)) {
      process.env.PATH = `${p}:${current}`;
    }
  }
}

function isOpencodeInstalled(): boolean {
  try {
    execSync("which opencode", { encoding: "utf-8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export class OpencodeNotInstalledError extends Error {
  constructor() {
    super("OpenCode is not installed. Install it with: brew install anomalyco/tap/opencode");
    this.name = "OpencodeNotInstalledError";
  }
}

/**
 * Get an SDK client backed by a managed OpenCode server.
 * Starts the server once and reuses it across all hook calls.
 * Throws OpencodeNotInstalledError if the binary is missing.
 */
export async function getClient(): Promise<OpencodeClient> {
  if (instance) return instance.client;

  if (!initializing) {
    initializing = (async () => {
      ensurePath();
      if (!isOpencodeInstalled()) {
        throw new OpencodeNotInstalledError();
      }
      instance = await createOpencode({ port: 0 });
      return instance.client;
    })().catch((err) => {
      initializing = null;
      throw err;
    });
  }

  return await initializing;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add OpenCode SDK client module"
```

---

### Task 4: Add content search and liveness detection to storage

**Files:**
- Modify: `src/lib/storage.ts`

Add three new exported functions: `searchSessions()`, `getOpenSessions()`, and `getDbPath()` (make it public for reuse). Add the `OpenSession` type.

- [ ] **Step 1: Add types and exports at the top of `src/lib/storage.ts`**

After the existing imports and before `function getDbPath()`, add the liveness types. Also export `getDbPath`.

Add these exports to the file:

```typescript
// --- Liveness types ---

export type SessionLiveness = "active" | "open";

export interface OpenSession {
  id: string;
  liveness: SessionLiveness;
}
```

Change `function getDbPath()` to `export function getDbPath()`.

- [ ] **Step 2: Add `searchSessions()` at the end of the file (before `escapeSql`)**

```typescript
function escLike(str: string): string {
  return str.replace(/'/g, "''").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function querySessionRows(sql: string): Promise<Session[]> {
  const rows = await executeSQL<SessionRow>(getDbPath(), sql);
  return rows.map(toSession);
}

/**
 * Multi-word scored search across session titles and message content.
 * Scoring: exact phrase in title (10), exact phrase in content (5),
 * individual words in title (3 each), individual words in content (1 each).
 */
export async function searchSessions(keyword: string, limit = 30): Promise<Session[]> {
  const escaped = escLike(keyword.toLowerCase().trim());
  if (!escaped) return [];

  const words = escaped.split(/\s+/).filter((w) => w.length >= 2);
  const base =
    "SELECT id, project_id, parent_id, slug, directory, title, version, share_url, summary_additions, summary_deletions, summary_files, time_created, time_updated, time_compacting, time_archived FROM session WHERE time_archived IS NULL AND parent_id IS NULL";
  const contentBase =
    "SELECT DISTINCT s.id, s.project_id, s.parent_id, s.slug, s.directory, s.title, s.version, s.share_url, s.summary_additions, s.summary_deletions, s.summary_files, s.time_created, s.time_updated, s.time_compacting, s.time_archived FROM part p JOIN message m ON p.message_id = m.id JOIN session s ON m.session_id = s.id WHERE s.time_archived IS NULL AND s.parent_id IS NULL";

  const scores = new Map<string, { session: Session; score: number }>();

  function addResults(sessions: Session[], score: number) {
    for (const s of sessions) {
      const existing = scores.get(s.id);
      if (existing) {
        existing.score += score;
      } else {
        scores.set(s.id, { session: s, score });
      }
    }
  }

  // 1. Exact phrase in title (score: 10)
  addResults(
    await querySessionRows(
      `${base} AND lower(title) LIKE '%${escaped}%' ESCAPE '\\' ORDER BY time_updated DESC LIMIT ${limit}`,
    ),
    10,
  );

  // 2. Exact phrase in content (score: 5)
  addResults(
    await querySessionRows(
      `${contentBase} AND (lower(json_extract(p.data, '$.text')) LIKE '%${escaped}%' ESCAPE '\\' OR lower(json_extract(p.data, '$.input')) LIKE '%${escaped}%' ESCAPE '\\') ORDER BY s.time_updated DESC LIMIT ${limit}`,
    ),
    5,
  );

  // 3. Individual words — only if multi-word query
  if (words.length > 1) {
    for (const word of words) {
      addResults(
        await querySessionRows(
          `${base} AND lower(title) LIKE '%${word}%' ESCAPE '\\' ORDER BY time_updated DESC LIMIT ${limit}`,
        ),
        3,
      );
      addResults(
        await querySessionRows(
          `${contentBase} AND (lower(json_extract(p.data, '$.text')) LIKE '%${word}%' ESCAPE '\\' OR lower(json_extract(p.data, '$.input')) LIKE '%${word}%' ESCAPE '\\') ORDER BY s.time_updated DESC LIMIT ${limit}`,
        ),
        1,
      );
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score || b.session.time.updated - a.session.time.updated)
    .slice(0, limit)
    .map((e) => e.session);
}
```

- [ ] **Step 3: Add `getOpenSessions()` after `searchSessions`**

```typescript
import { exec } from "child_process";
import { promisify } from "util";
```

Add these imports at the top of the file, then add:

```typescript
const execAsync = promisify(exec);

let openSessionsCache: { data: OpenSession[]; timestamp: number } | null = null;
const OPEN_SESSIONS_TTL = 5_000;

/**
 * Detect running opencode processes and determine their liveness.
 * "active" = recently updated or has in-progress todos.
 * "open" = process running but idle.
 * Results cached for 5 seconds.
 */
export async function getOpenSessions(): Promise<OpenSession[]> {
  if (openSessionsCache && Date.now() - openSessionsCache.timestamp < OPEN_SESSIONS_TTL) {
    return openSessionsCache.data;
  }

  const processIds: string[] = [];
  try {
    const { stdout } = await execAsync("ps aux");
    for (const line of stdout.split("\n")) {
      if (!line.includes("opencode")) continue;
      const match = line.match(/(?:-s|--session)[=\s]+(\S+)/);
      if (match && !processIds.includes(match[1])) {
        processIds.push(match[1]);
      }
    }
  } catch {
    return [];
  }

  if (processIds.length === 0) return [];

  const cutoff = Date.now() - 60_000;
  const inClause = processIds.map((id) => `'${escapeSql(id)}'`).join(",");

  const [recentRows, todoRows] = await Promise.all([
    executeSQL<{ id: string }>(
      getDbPath(),
      `SELECT id FROM session WHERE id IN (${inClause}) AND time_updated > ${cutoff}`,
    ).catch(() => [] as { id: string }[]),
    executeSQL<{ session_id: string }>(
      getDbPath(),
      `SELECT DISTINCT session_id FROM todo WHERE session_id IN (${inClause}) AND status = 'in_progress'`,
    ).catch(() => [] as { session_id: string }[]),
  ]);

  const recentlyUpdated = new Set(recentRows.map((r) => r.id));
  const hasTodos = new Set(todoRows.map((r) => r.session_id));

  const result = processIds.map((id) => ({
    id,
    liveness: (recentlyUpdated.has(id) || hasTodos.has(id) ? "active" : "open") as SessionLiveness,
  }));
  openSessionsCache = { data: result, timestamp: Date.now() };
  return result;
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add content search and liveness detection to storage"
```

---

### Task 5: Add `formatRelativeTime` to utils

**Files:**
- Modify: `src/utils.ts`

Add a relative time formatter for list item accessories (used alongside liveness tags).

- [ ] **Step 1: Add `formatRelativeTime` export to `src/utils.ts`**

Add after the existing `formatTime` function:

```typescript
export function formatRelativeTime(timestamp: number): string {
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return new Date(ts).toLocaleDateString();
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add formatRelativeTime utility"
```

---

### Task 6: Update hooks with liveness, content search, and SDK hooks

**Files:**
- Modify: `src/hooks/useSessions.ts`

Add hooks for open sessions, content search, and SDK-based todos/messages. Update the main `useSessions` hook to include liveness data.

- [ ] **Step 1: Rewrite `src/hooks/useSessions.ts`**

```typescript
import { useCachedPromise } from "@raycast/utils";
import { Todo } from "@opencode-ai/sdk/v2/client";

import { getClient } from "../lib/clients";
import {
  checkDatabase,
  getOpenSessions,
  loadProjects,
  loadSessions,
  searchSessions,
  OpenSession,
} from "../lib/storage";
import { Project, Session, SessionWithProject } from "../types";

export type { OpenSession };

export type MessageWithParts = {
  info: {
    id: string;
    sessionID: string;
    role: "user" | "assistant";
    time: { created: number };
  };
  parts: Array<{
    id: string;
    type: string;
    text?: string;
  }>;
};

interface UseSessionsResult {
  sessions: SessionWithProject[];
  projects: Project[];
  isLoading: boolean;
  storageError: string | null;
  mutate: () => Promise<void>;
}

export function useSessions(): UseSessionsResult {
  const { data: versionError, isLoading: versionLoading } = useCachedPromise(checkDatabase);

  const storageOk = !versionLoading && versionError === null;

  const {
    data: projectsData,
    isLoading: projectsLoading,
    mutate: mutateProjects,
  } = useCachedPromise(loadProjects, [], {
    keepPreviousData: true,
    execute: storageOk,
  });

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    mutate: mutateSessions,
  } = useCachedPromise(loadSessions, [], {
    keepPreviousData: true,
    execute: storageOk,
  });

  const projects = projectsData ?? [];
  const sessions = sessionsData ?? [];

  const projectMap = new Map<string, Project>();
  for (const project of projects) {
    projectMap.set(project.id, project);
  }

  const sessionsWithProjects: SessionWithProject[] = sessions.map((session) => ({
    session,
    project: projectMap.get(session.projectID),
  }));

  const mutate = async () => {
    await Promise.all([mutateProjects(), mutateSessions()]);
  };

  return {
    sessions: sessionsWithProjects,
    projects,
    isLoading: versionLoading || (storageOk && (!sessionsData || projectsLoading || sessionsLoading)),
    storageError: versionError ?? null,
    mutate,
  };
}

export function useOpenSessions() {
  return useCachedPromise(getOpenSessions);
}

export function useContentSearch(searchQuery: string) {
  return useCachedPromise(
    async (q: string) => {
      if (!q || q.length < 3) return [] as Session[];
      return searchSessions(q);
    },
    [searchQuery],
  );
}

export function useSessionTodos(sessionId: string) {
  return useCachedPromise(
    async (id: string) => {
      const client = await getClient();
      const result = await client.session.todo({ sessionID: id });
      return result.data ?? ([] as Todo[]);
    },
    [sessionId],
  );
}

export function useSessionMessages(sessionId: string) {
  return useCachedPromise(
    async (id: string) => {
      const client = await getClient();
      const result = await client.session.messages({ sessionID: id, limit: 10 });
      return (result.data ?? []) as MessageWithParts[];
    },
    [sessionId],
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add liveness, content search, and SDK hooks"
```

---

### Task 7: Add SessionActivity component

**Files:**
- Create: `src/components/SessionActivity.tsx`

Shows todos and recent messages for a session, fetched via the SDK.

- [ ] **Step 1: Create `src/components/SessionActivity.tsx`**

```typescript
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { MessageWithParts, useSessionMessages, useSessionTodos } from "../hooks/useSessions";
import { resumeSession } from "../lib/terminal";
import { Session } from "../types";

interface SessionActivityProps {
  session: Session;
}

export function SessionActivity({ session }: SessionActivityProps) {
  const { data: todos = [] } = useSessionTodos(session.id);
  const { data: messages = [] } = useSessionMessages(session.id);

  const todoSection =
    todos.length > 0
      ? `## Tasks\n\n${todos
          .map((t) => {
            const icon =
              t.status === "completed"
                ? "\u2705"
                : t.status === "in_progress"
                  ? "\uD83D\uDD04"
                  : t.status === "cancelled"
                    ? "\u274C"
                    : "\u2B1C";
            return `${icon} ${t.content}`;
          })
          .join("\n")}`
      : "";

  const activitySection =
    messages.length > 0
      ? `## Recent Activity\n\n${(messages as MessageWithParts[])
          .map((m) => {
            const roleIcon = m.info.role === "user" ? "\uD83D\uDC64" : "\uD83E\uDD16";
            const textPart = m.parts.find((p) => p.type === "text");
            const text = textPart?.text ?? "";
            const truncated = text.length > 120 ? text.slice(0, 117) + "..." : text;
            return `${roleIcon} ${truncated}`;
          })
          .join("\n\n")}`
      : "";

  const markdown = [`# ${session.title || session.slug}`, todoSection, activitySection].filter(Boolean).join("\n\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={session.title || session.slug}
      actions={
        <ActionPanel>
          <Action
            title="Resume in Terminal"
            icon={Icon.Terminal}
            onAction={() => resumeSession(session.directory, session.id)}
          />
          <Action.CopyToClipboard
            title="Copy Session ID"
            content={session.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add SessionActivity component with todos and messages"
```

---

### Task 8: Update SessionListItem with liveness tags

**Files:**
- Modify: `src/components/SessionListItem.tsx`

Add liveness tag accessories and pass liveness data through props.

- [ ] **Step 1: Rewrite `src/components/SessionListItem.tsx`**

```typescript
import { Color, List } from "@raycast/api";

import { OpenSession } from "../hooks/useSessions";
import { Project, Session } from "../types";
import { formatRelativeTime, repoName } from "../utils";
import { SessionActions } from "./SessionActions";

interface SessionListItemProps {
  session: Session;
  project: Project | undefined;
  liveness: OpenSession["liveness"] | undefined;
  mutate: () => Promise<void>;
}

function livenessTag(liveness: OpenSession["liveness"] | undefined): List.Item.Accessory | null {
  if (liveness === "active") return { tag: { value: "Active", color: Color.Green } };
  if (liveness === "open") return { tag: { value: "Open", color: Color.Blue } };
  return null;
}

export function SessionListItem({ session, project, liveness, mutate }: SessionListItemProps) {
  const repo = project ? repoName(project.worktree) : undefined;
  const title = session.title || session.slug;

  const accessories: List.Item.Accessory[] = [];

  if (repo && project?.worktree !== "/") {
    accessories.push({ tag: repo });
  }

  const tag = livenessTag(liveness);
  if (tag) accessories.push(tag);

  accessories.push({
    text: formatRelativeTime(session.time.updated),
    tooltip: `Last message: ${new Date(session.time.updated).toLocaleString()}`,
  });

  return (
    <List.Item
      id={session.id}
      title={title}
      subtitle={session.directory}
      keywords={[session.slug, repo ?? "", session.directory, session.id]}
      accessories={accessories}
      actions={
        <SessionActions session={session} project={project} liveness={liveness} mutate={mutate} />
      }
    />
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add liveness tags to SessionListItem"
```

---

### Task 9: Update SessionActions with terminal resume and activity view

**Files:**
- Modify: `src/components/SessionActions.tsx`

Add "Resume in Terminal" as primary action, add "View Activity" push, add "New Session" action. Accept `liveness` prop.

- [ ] **Step 1: Rewrite `src/components/SessionActions.tsx`**

```typescript
import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  Toast,
  confirmAlert,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync } from "fs";

import { OpenSession } from "../hooks/useSessions";
import { deleteAllProjectSessions, deleteSession as deleteSessionFromDisk, loadTranscript } from "../lib/storage";
import { openOpenCode, resumeSession } from "../lib/terminal";
import { Project, Session } from "../types";
import { buildTranscriptMarkdown, repoName, shellEscape } from "../utils";
import { SessionActivity } from "./SessionActivity";
import { SessionDetail } from "./SessionDetail";
import { SessionSummary } from "./SessionSummary";

interface SessionActionsProps {
  session: Session;
  project: Project | undefined;
  liveness?: OpenSession["liveness"];
  mutate: () => Promise<void>;
  isDetail?: boolean;
  isSummary?: boolean;
  children?: React.ReactNode;
}

export function SessionActions({
  session,
  project,
  liveness,
  mutate,
  isDetail,
  isSummary,
  children,
}: SessionActionsProps) {
  const { pop } = useNavigation();

  const dir = shellEscape(session.directory);
  const sid = shellEscape(session.id);
  const resumeCommand = `cd ${dir} && opencode -s ${sid}`;

  async function handleCopyTranscript() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Loading transcript..." });

    try {
      const transcript = await loadTranscript(session.id);
      const markdown = buildTranscriptMarkdown(transcript);

      await Clipboard.copy(markdown);

      toast.style = Toast.Style.Success;
      toast.title = "Transcript copied";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to copy transcript" });
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Session",
      message: `Are you sure you want to delete "${session.title || session.slug}"? This cannot be undone.`,
      icon: { source: Icon.Trash, tintColor: "#FF0000" },
    });

    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting session..." });

    try {
      await deleteSessionFromDisk(session);
      toast.style = Toast.Style.Success;
      toast.title = "Session deleted";

      if (isDetail) pop();

      await mutate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete session" });
    }
  }

  async function handleDeleteAllProjectSessions() {
    const projectName = project ? repoName(project.worktree) : session.projectID;
    const confirmed = await confirmAlert({
      title: `Delete All Sessions in "${projectName}"`,
      message: `This will permanently delete all sessions for this project. The project will no longer appear in the list.`,
      icon: { source: Icon.Trash, tintColor: "#FF0000" },
    });

    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting all project sessions..." });

    try {
      await deleteAllProjectSessions(session.projectID);

      toast.style = Toast.Style.Success;
      toast.title = `All sessions in "${projectName}" deleted`;

      if (isDetail) pop();

      await mutate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete project sessions" });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Resume in Terminal"
          icon={Icon.Terminal}
          onAction={() => resumeSession(session.directory, session.id, liveness !== undefined)}
        />
        {!isDetail && (
          <Action.Push
            title="View Transcript"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            target={<SessionDetail session={session} project={project} mutate={mutate} />}
          />
        )}
        <Action.Push
          title="View Activity"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "a" }}
          target={<SessionActivity session={session} />}
        />
        {!isSummary && (
          <Action.Push
            title="Summarize"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<SessionSummary session={session} project={project} mutate={mutate} />}
          />
        )}
        {children}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="New Session"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => openOpenCode(session.directory)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Copy Transcript"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={handleCopyTranscript}
        />
        <Action.CopyToClipboard
          title="Copy Resume Command"
          content={resumeCommand}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
        <Action.CopyToClipboard
          title="Copy Session ID"
          content={session.id}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action.CopyToClipboard title="Copy Slug" content={session.slug} />
        <Action.CopyToClipboard title="Copy Project Directory" content={session.directory} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {session.share?.url && (
          <Action.OpenInBrowser
            title="Open Share Link"
            url={session.share.url}
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
        )}
        <Action
          title="Open Project Directory"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={async () => {
            if (!existsSync(session.directory)) {
              await showToast({ style: Toast.Style.Failure, title: "Directory not found", message: session.directory });
              return;
            }
            await open(session.directory);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Delete Session"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={handleDelete}
        />
        <Action
          title="Delete All Project Sessions"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleDeleteAllProjectSessions}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={mutate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add terminal resume, activity view, and new session to actions"
```

---

### Task 10: Rewrite main command with dual-mode search

**Files:**
- Modify: `src/search-sessions.tsx` (was `src/index.tsx`, renamed in Task 1)

Replace Raycast built-in filtering with custom search. Default mode: time-grouped, liveness-sorted. Search mode: flat scored results.

- [ ] **Step 1: Rewrite `src/search-sessions.tsx`**

```typescript
import { Icon, List } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";

import { ProjectDropdown } from "./components/ProjectDropdown";
import { SessionListItem } from "./components/SessionListItem";
import { OpenSession, useContentSearch, useOpenSessions, useSessions } from "./hooks/useSessions";
import { SessionWithProject } from "./types";
import { groupSessionsByTime } from "./utils";

function getLiveness(openSessions: OpenSession[], sessionId: string): OpenSession["liveness"] | undefined {
  return openSessions.find((o) => o.id === sessionId)?.liveness;
}

function sortByLiveness(sessions: SessionWithProject[], openSessions: OpenSession[]): SessionWithProject[] {
  return [...sessions].sort((a, b) => {
    const aLive = getLiveness(openSessions, a.session.id);
    const bLive = getLiveness(openSessions, b.session.id);
    const livenessOrder = (l: typeof aLive) => (l === "active" ? 0 : l === "open" ? 1 : 2);
    const diff = livenessOrder(aLive) - livenessOrder(bLive);
    return diff !== 0 ? diff : b.session.time.updated - a.session.time.updated;
  });
}

export default function SearchSessions() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const { sessions, projects, isLoading: sessionsLoading, storageError, mutate } = useSessions();
  const { data: rawOpen } = useOpenSessions();
  const openSessions: OpenSession[] = Array.isArray(rawOpen) ? rawOpen : [];

  const isSearching = searchText.length >= 3;
  const { data: searchResults = [], isLoading: searchLoading } = useContentSearch(searchText);

  const handleProjectChange = useCallback((projectID: string) => {
    setSelectedProject(projectID);
  }, []);

  // Only show projects that have at least one session
  const projectsWithSessions = useMemo(() => {
    const projectIDs = new Set(sessions.map((s) => s.session.projectID));
    return projects.filter((p) => projectIDs.has(p.id));
  }, [sessions, projects]);

  // Fall back to "all" if stored project no longer exists
  const validProject = useMemo(() => {
    if (selectedProject === "all") return "all";
    return projectsWithSessions.some((p) => p.id === selectedProject) ? selectedProject : "all";
  }, [selectedProject, projectsWithSessions]);

  // Build project lookup for search results
  const projectMap = useMemo(() => {
    const map = new Map<string, (typeof projects)[0]>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  const isLoading = isSearching ? searchLoading : sessionsLoading;

  if (isSearching) {
    // Search mode: flat results sorted by relevance (already sorted by searchSessions)
    const searchSessionsWithProjects: SessionWithProject[] = searchResults.map((session) => ({
      session,
      project: projectMap.get(session.projectID),
    }));

    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search sessions by title or content..."
        filtering={false}
        onSearchTextChange={setSearchText}
        throttle
        searchBarAccessory={<ProjectDropdown projects={projectsWithSessions} onProjectChange={handleProjectChange} />}
      >
        {searchSessionsWithProjects.length === 0 && !isLoading ? (
          <List.EmptyView
            title="No Matches"
            description="Try a different search term (min 3 characters)."
            icon={Icon.MagnifyingGlass}
          />
        ) : (
          searchSessionsWithProjects.map(({ session, project }) => (
            <SessionListItem
              key={session.id}
              session={session}
              project={project}
              liveness={getLiveness(openSessions, session.id)}
              mutate={mutate}
            />
          ))
        )}
      </List>
    );
  }

  // Default mode: time-grouped, liveness-sorted
  const filtered = validProject === "all" ? sessions : sessions.filter((s) => s.session.projectID === validProject);
  const sorted = sortByLiveness(filtered, openSessions);
  const grouped = groupSessionsByTime(sorted);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sessions by title or content..."
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={<ProjectDropdown projects={projectsWithSessions} onProjectChange={handleProjectChange} />}
    >
      {storageError ? (
        <List.EmptyView title="Storage Error" description={storageError} icon={Icon.ExclamationMark} />
      ) : filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Sessions Found"
          description={
            selectedProject === "all"
              ? "No OpenCode sessions found. Start a session with opencode to see it here."
              : "No sessions found for this project."
          }
          icon={Icon.Terminal}
        />
      ) : (
        grouped.map(([section, items]) => (
          <List.Section key={section} title={section}>
            {items.map(({ session, project }) => (
              <SessionListItem
                key={session.id}
                session={session}
                project={project}
                liveness={getLiveness(openSessions, session.id)}
                mutate={mutate}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: rewrite main command with dual-mode search and liveness"
```

---

### Task 11: Add new-session command

**Files:**
- Create: `src/new-session.ts`

- [ ] **Step 1: Create `src/new-session.ts`**

```typescript
import { LaunchProps } from "@raycast/api";
import { openOpenCode } from "./lib/terminal";

export default async function NewSession(props: LaunchProps<{ arguments: { directory?: string; prompt?: string } }>) {
  const directory = props.arguments.directory || process.env.HOME || "/";
  await openOpenCode(directory, props.arguments.prompt);
}
```

- [ ] **Step 2: Delete old `src/index.tsx` if it still exists**

Verify `src/index.tsx` was renamed to `src/search-sessions.tsx` in Task 1. If both exist, delete `src/index.tsx`.

- [ ] **Step 3: Final build and lint**

Run: `npm run build && npm run lint`
Expected: Both pass clean.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add new-session command"
```

---

### Task 12: Manual verification

- [ ] **Step 1: Run `npm run dev` and test in Raycast**

Open Raycast and verify:
1. "Search Sessions" command appears and loads sessions
2. Time-grouped display works in default mode
3. Typing ≥3 chars triggers content search
4. Active/Open liveness tags appear for running sessions
5. "Resume in Terminal" opens the configured terminal
6. "View Transcript", "View Activity", "Summarize" push views work
7. "New Session" command starts opencode in a new terminal tab
8. Project dropdown filters correctly
9. All copy/delete actions work

- [ ] **Step 2: Final commit with any fixes**

```bash
git add -A && git commit -m "chore: final cleanup after manual testing"
```
