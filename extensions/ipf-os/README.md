# iPF OS

Raise, track, and action iPF OS tickets without leaving your keyboard.

Staff-only. Sign in with your Google Workspace account through the web app.

## Getting Started

1. Run **Search Tickets** or **Create Ticket**.
2. Choose **Connect to iPF OS**, sign in with Google, then **Approve**.
3. Raycast stores a token and refreshes it silently.

To disconnect: Action Panel → **Sign Out**, or Raycast → Settings → Extensions → iPF OS → Logout.

## Commands

### Search Tickets

Find any ticket and act on it. Opens on **Watching**, and widens from there.

| Scope | Meaning |
| --- | --- |
| Watching | Tickets you participate in (default) |
| Assigned to Me | Tickets assigned to you |
| My Tickets | Tickets you created |
| All Tickets | Organisation-wide |

Type to search ticket number, title, or description. Filter by status or type from the Action Panel.

**Return** opens the ticket. From there you can start progress, close, comment, assign, or review — actions appear only when you are allowed to use them.

### Create Ticket

Raise a ticket and route it to a department. Optional assignee, project, and sprint.

Priority is not a field you pick. It is derived from due date:

| Due in | Priority |
| --- | --- |
| ≤ 4 hours | Critical |
| ≤ 24 hours | High |
| ≤ 72 hours | Medium |
| Later, or no due date | Normal |

Past due dates are rejected. Leave assignee empty to auto-route.

### Assigned Tickets

Menu bar count of open tickets assigned to you. Overdue first. Click a row to open it in iPF OS.

Does not prompt you to sign in. Connect from **Search Tickets** or **Create Ticket** first.

## Actions

Shown only when the server allows them.

| Action | macOS | Windows |
| --- | --- | --- |
| Open ticket | `Return` | `Return` |
| Open in iPF OS | `⌘` `Enter` | `Ctrl` `Enter` |
| Copy ticket number | `⌘` `C` | `Ctrl` `C` |
| Refresh | `⌘` `R` | `Ctrl` `R` |
| Start progress | `⌘` `⇧` `S` | `Ctrl` `⇧` `S` |
| Comment | `⌘` `⇧` `M` | `Ctrl` `⇧` `M` |
| Close | `⌘` `⇧` `X` | `Ctrl` `⇧` `X` |
| Assign | `⌘` `⇧` `A` | `Ctrl` `⇧` `A` |
| Verify (closed) | `⌘` `⇧` `V` | `Ctrl` `⇧` `V` |
| Reject (closed) | `⌘` `⇧` `J` | `Ctrl` `⇧` `J` |

Statuses: `Open` → `In Progress` → `Closed`. Closed is terminal. `Blocked` cannot be changed here. Review (`Verified` / `Rejected`) applies only to a closed, unverified ticket.

## Preferences

| Preference | Example | Notes |
| --- | --- | --- |
| API Gateway | `http://localhost:8080/api/v1` | Must include `/api/v1` |
| Web App | `http://localhost:3000` | — |

Ask your admin for the correct values for your environment. Both must point to the same environment.

## FAQ

**Nothing in Assigned Tickets.** The menu bar doesn't start Connect — run **Search Tickets** once first.

**Auth errors after signing in.** Sign Out and reconnect with your Google staff account.

## Development

```bash
npm install
npm run dev
```

`npm run dev` sideloads the extension into Raycast with hot reload. `npm run lint` and `npm run build` are the store checks.
