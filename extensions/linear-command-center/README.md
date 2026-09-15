# Linear Command Center

Linear Command Center puts your assigned Linear work in the menu bar and leads with the exceptions: agent sessions waiting for input, blocked or overdue issues, review queues, and active work that has gone stale. You stay oriented without keeping Linear open.

## How it differs from the Linear extension

The official Linear extension is a full client: browse issues, projects, and cycles, with a menu-bar list of what is assigned to you. This extension is narrower and exceptions-first. The menu bar shows only what needs a decision from you, it understands Linear agent sessions and delegation (an agent waiting on input is surfaced ahead of everything else), and it flags stale work on a timer you set. Use the official extension to work in Linear. This one tells you when something needs you.

## Commands

- **Linear Pulse** shows work needing attention, reviews, active agent sessions, and active issues in the menu bar. It refreshes every 15 minutes.
- **Linear Work Dashboard** is a searchable queue with actions to open an issue, follow its agent session, change its status, or add a progress note.
- **Quick Capture Linear Issue** creates an issue with a team, workflow status, project, and priority.

## Configuration

- **Preferred Team Key** limits the dashboard to one team and preselects it in Quick Capture. Leave it blank to see assigned work across teams.
- **Agent Project ID** marks one Linear project, by ID, as agent-managed.
- **Agent Project Keywords** recognizes agent work by words in the project name. Linear delegation, agent labels, and active agent sessions are recognized without this.
- **Review Status Names** names your review statuses. When blank, any status containing `review` counts.
- **Stale After** is how many hours a started issue can go without an update before it needs attention.
- **Menu Items per Section** caps each menu-bar section. The dashboard always shows everything.
- **Demo Data** swaps your workspace for sample issues, for previews and screenshots. Keep it off otherwise.

## Permissions and privacy

The extension asks for Linear `read write` OAuth access because its actions create issues, change statuses, and add comments. Sign-in uses Raycast's Linear OAuth with PKCE. Raycast holds the tokens; the extension never writes or logs them.

Your Linear data goes only to Linear's GraphQL API. There is no analytics, telemetry, custom backend, or file-system access.

External links, including agent sessions, open only when you choose an action, and only over `https` or `http`.

## Development

Requires Node.js 22 and npm.

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

## License

MIT
