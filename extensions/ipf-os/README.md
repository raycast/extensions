# iPF OS

Manage iPF OS tickets and your staff meals without leaving your keyboard.

Staff-only. Sign in with your Google Workspace account through the web app.

## Getting Started

1. Run **My Meals**, **Plan My Meals**, **Search Tickets** or **Create Ticket**.
2. Choose **Connect to iPF OS**, sign in with Google, then **Approve**.
3. Raycast stores a token and refreshes it silently.

To disconnect: Action Panel → **Sign Out**, or Raycast → Settings → Extensions → iPF OS → Logout.

## Commands

### Search Tickets

Find and act on tickets you watch, are assigned to, or created. Opens on **Watching**.

| Scope          | Meaning                              |
| -------------- | ------------------------------------ |
| Watching       | Tickets you participate in (default) |
| Assigned to Me | Tickets assigned to you              |
| My Tickets     | Tickets you created                  |

Type to search ticket number, title, or description. Filter by status or type from the Action Panel.

**Return** opens the ticket. From there you can start progress, close, comment, assign, or review — actions appear only when you are allowed to use them.

### Create Ticket

Raise a ticket and route it to a department. Optional assignee, project, and sprint.

Priority is not a field you pick. It is derived from due date:

| Due in                | Priority |
| --------------------- | -------- |
| ≤ 4 hours             | Critical |
| ≤ 24 hours            | High     |
| ≤ 72 hours            | Medium   |
| Later, or no due date | Normal   |

Elapsed deadlines are rejected; today is allowed when the selected time is still ahead. Use the Due Date actions to select a deadline in 1 hour, 2 hours, 4 hours, or 1 day, or choose a date and time manually. Leave assignee empty to auto-route.

### Assigned Tickets

Menu bar count of open tickets assigned to you. Overdue first. Click a row to open it in iPF OS.

Does not prompt you to sign in. Connect from **Search Tickets** or **Create Ticket** first.

### My Meals

See this week's saved meals, with today selected. Switch to **Next Week** or
**History** from the week dropdown. Each day shows your selection, a deliberate
skip, or that no selection or menu is available. The detail pane includes the
menu and any absence notice.

Use the Action Panel to open the planner, manage next-week availability, change
meal reminders, or notify Meals staff of an absence. Turning availability off
asks before canceling an existing submission. Absence notices are separate
from cancellation: notices received at or after **08:00 EAT** are late, and do
not promise an order cancellation or charge reversal. Notices cannot be edited
or withdrawn here.

### Plan My Meals

1. Open the target week and choose a weekday.
2. Choose an offered main and an optional compatible side, or explicitly skip
   the day. Complete dishes do not have sides.
3. **Apply to Draft** returns to the week overview. It does not submit meals.
4. Use **Review Plan**, check the whole week and skipped days, then choose
   **Submit Plan** or **Update Submitted Plan** when the selection window allows it.

**Use Recent Choices** and **Use Popular Choices** fill a draft for review.
Unavailable copied meals remain unresolved so you can replace them. Recent
choices are selected by the server; this is not a specific historical-week copy.

Drafts survive closing Raycast and failed requests. They stay separate for each
account, gateway and week, and are removed on sign-out. Refresh before replacing
a saved plan changed through another client. Final submission rechecks the menu,
selection window and saved plan; the API does not provide atomic conflict checks.

Use **Reset Draft** to start again, or **Use Saved Plan** / **Discard Draft** to
remove unsent changes. Canceling a submitted plan keeps a separate unsent draft.
Drafts for other weeks remain visible under **Other Unsubmitted Drafts**, with
their original dates and a read-only view.

Press **⌘ Enter** on macOS or **Ctrl Enter** on Windows to open Review Plan.
Review refreshes eligibility and offers **Fix [Weekday]** when a choice needs
attention. Meal search includes offered and selected meal names.

The normal selection window is Friday **07:00–17:00 EAT**, with grace until
**17:30**. The current server window, including special openings, is authoritative.
You can prepare a draft while submission is closed.

### Meals Status

Optional **macOS** menu bar command showing today's saved meal and the selection
window. Enable it in Raycast Settings → Extensions → iPF OS. It refreshes every
30 minutes and after confirmed changes in the Meals commands. It does not
prompt for sign-in in the background. All employee operations are available in
**My Meals** and **Plan My Meals** without enabling the menu bar.

## AI assistance

Use **Ask iPF OS** or mention `@ipf-os` in Raycast AI:

- “What is my lunch today?”
- “Show popular choices for next week without changing anything.”
- “Prepare a meal draft using these choices for me to review.”

AI reads your own saved meals and the offered menu. Preparing a draft requires
a confirmation showing the week and each day's meals, then opens **Plan My Meals**
for review. **AI does not submit meals.** You explicitly submit from the review
screen. Raycast AI access is required for chat assistance; ordinary commands do
not depend on it.

AI planning uses the server's target week, including administrator overrides.
“Next Week” in My Meals continues to show the regular upcoming calendar week.

## Actions

Shown only when the server allows them.

| Action             | macOS       | Windows        |
| ------------------ | ----------- | -------------- |
| Open ticket        | `Return`    | `Return`       |
| Open in iPF OS     | `⌘` `Enter` | `Ctrl` `Enter` |
| Copy ticket number | `⌘` `C`     | `Ctrl` `C`     |
| Refresh            | `⌘` `R`     | `Ctrl` `R`     |
| Start progress     | `⌘` `⇧` `S` | `Ctrl` `⇧` `S` |
| Comment            | `⌘` `⇧` `M` | `Ctrl` `⇧` `M` |
| Close              | `⌘` `⇧` `X` | `Ctrl` `⇧` `X` |
| Assign             | `⌘` `⇧` `A` | `Ctrl` `⇧` `A` |
| Verify (closed)    | `⌘` `⇧` `V` | `Ctrl` `⇧` `V` |
| Reject (closed)    | `⌘` `⇧` `J` | `Ctrl` `⇧` `J` |

Statuses: `Open` → `In Progress` → `Closed`. Closed is terminal. `Blocked` cannot be changed here. Review (`Verified` / `Rejected`) applies only to a closed, unverified ticket.

## Preferences

| Preference  | Example                        | Notes                  |
| ----------- | ------------------------------ | ---------------------- |
| API Gateway | `http://localhost:8080/api/v1` | Must include `/api/v1` |
| Web App     | `http://localhost:3000`        | —                      |

Ask your admin for the correct values for your environment. Both must point to the same environment.

## FAQ

**Nothing in Assigned Tickets.** The menu bar doesn't start Connect — run **Search Tickets** once first.

**Auth errors after signing in.** Sign Out and reconnect with your Google staff account.

## Screenshots

See the [screenshot gallery](docs/screenshots.md) for ticket and employee Meals views.

## Development

```bash
npm install
npm run dev
```

`npm run dev` sideloads the extension into Raycast with hot reload. `npm run lint` and `npm run build` are the store checks.
