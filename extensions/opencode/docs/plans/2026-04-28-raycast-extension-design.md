# Raycast Extension for OpenCode

## Goal

A Raycast extension for managing OpenCode projects and sessions from anywhere on macOS. Two commands: Search Projects and Search Sessions. Both include status visibility (running/idle/waiting), current tasks, and recent activity.

## Data Source

Uses `@opencode-ai/sdk` (`createOpencodeClient`) connected to running OpenCode servers.

### Server Discovery

No built-in discovery mechanism exists in OpenCode. The extension discovers servers by:

1. Parsing `ps aux` for `opencode` processes
2. Using `lsof -p <pid> -iTCP -sTCP:LISTEN` to find listening ports
3. Calling `GET /global/health` to verify the server is alive
4. Caching results with a 5-second TTL

This returns an array of `{ baseUrl, version, pid }` for all running instances.

### Client Pool

A `createOpencodeClient({ baseUrl })` instance is created per discovered server. Data from multiple servers is merged when listing projects and sessions.

## Commands

### Search Projects

**Data:** `client.project.list()` + `client.project.current()` + `GET /session/status`

**List view:**
- Name, directory path, icon
- Badge: number of active sessions

**Actions:**
- **Open** (Enter) — focus existing iTerm2 tab if running, otherwise open new tab with `opencode` in that directory
- **New Session** — always open fresh iTerm2 tab with `opencode`
- **View Sessions** — push to filtered session list for that project

### Search Sessions

**Data:** `client.session.list()` + `GET /session/status` + `GET /session/:id/todo`

**List view:**
- Title, project name, last updated time
- Status badge: running (green), idle (gray), waiting for input (yellow)
- Subtitle: current in-progress todo item

**Actions:**
- **Resume** (Enter) — open iTerm2 tab with `opencode -s <session_id>` in the session's directory
- **View Activity** — detail view with recent messages and full todo list
- **Copy Session ID**

**Activity detail view:**
- Todo list with status indicators (pending/in_progress/completed)
- Recent messages (last 5-10) with timestamps
- Session metadata

## Terminal Integration

Uses iTerm2 AppleScript integration via Raycast's `runAppleScript`:

- **Focus existing:** Find iTerm2 tab running opencode for the target directory, bring to front
- **Launch new:** Create new iTerm2 tab, `cd` to directory, run `opencode` command
- **Resume session:** Create new iTerm2 tab, `cd` to directory, run `opencode -s <id>`

## Project Structure

```
opencode/
├── package.json
├── src/
│   ├── search-projects.tsx
│   ├── search-sessions.tsx
│   ├── lib/
│   │   ├── discovery.ts       # ps + lsof + health check
│   │   ├── clients.ts         # SDK client pool
│   │   ├── terminal.ts        # iTerm2 AppleScript
│   │   └── hooks.ts           # useProjects, useSessions, useStatus
│   └── components/
│       ├── SessionDetail.tsx
│       └── StatusBadge.tsx
```

## Dependencies

- `@opencode-ai/sdk` — type-safe API client
- `@raycast/api` — Raycast extension framework
- `@raycast/utils` — hooks, caching, async state

## Edge Cases

- **No servers running:** Show empty state with "Start OpenCode" action that opens iTerm2 with `opencode`
- **Server goes down mid-use:** Retry discovery on next action, show stale data with warning
- **Multiple servers for same project:** Merge session lists, deduplicate by session ID
