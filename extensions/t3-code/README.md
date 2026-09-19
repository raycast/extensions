# T3 Code for Raycast

Three commands against the T3 Code server running on this Mac.

- **Prompt T3 Code** — write a prompt, pick a project, optionally branch into a git worktree. Creates the thread, sends the prompt, opens the thread in T3 Code.
- **Waiting T3 Threads** — active threads (not settled, snoozed or archived) whose agent has stopped.
- **Search T3 Threads** — every live thread, by title, project or branch.

## Setup

Issue a token and paste it into the extension preferences on first run:

```
~/.t3/cli/node_modules/.bin/t3 auth session issue --ttl 365d --label raycast --token-only
```

Revoke it with `t3 auth session revoke`, list sessions with `t3 auth session list`.

The server origin comes from `~/.t3/userdata/server-runtime.json` unless the
`Server Origin` preference is set, so a restarted server on a new port needs no
reconfiguration.

## How it talks to T3

`GET /api/orchestration/shell` for the thread list, `POST /api/orchestration/dispatch`
for commands, `GET /.well-known/t3/environment` for the environment id used in
`t3code://app/<environmentId>/<threadId>` deep links.

Worktrees are created by the extension with `git worktree add`, because
`bootstrap.prepareWorktree` runs on the server's WebSocket path only and the HTTP
dispatch handler passes commands straight to the engine. The path matches T3's own
convention, `~/.t3/worktrees/<repo>/<branch>`.

A new session inherits the model and runtime mode from the newest thread in the same
project, so the extension never carries its own model list.

## Development

```
npm install
npm run dev
```
