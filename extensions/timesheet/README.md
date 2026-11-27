# Timesheet Raycast Extension

Track your time with [timesheet.io](https://timesheet.io) directly from Raycast.

Runs on macOS and Windows. The menu bar timer is macOS only, because Raycast does not
offer menu bar commands on Windows.

## Features

- ⏱️ **Menu Bar Timer** - See your running timer at a glance (macOS only)
- ▶️ **Start/Stop Timer** - Quick timer control for any project
- 📊 **Timer Status** - Detailed view of current session and today's summary
- 📁 **Browse Projects** - Search and manage all your projects
- 📋 **Today's Tasks** - View all tasks logged today
- ⚡ **Quick Log** - Manually log time without starting a timer
- 📝 **Add Note** - Attach a note (and optional file) to the running timer
- 💶 **Add Expense** - Attach an expense (and optional receipt) to the running timer
- ☕ **Add Break** - Log a break within the running timer's window
- ✅ **Todos** - Browse open/closed todos and mark them done
- 👥 **Team Status** - See who on your team is currently tracking time
- 🏖️ **Absences** - View absences in your organization
- 👤 **My Profile** - Account, plan and subscription info
- 🤖 **AI Extension** - Control your timer in plain language from Raycast AI, mention
  projects and todos with `@`, and reach the rest of Timesheet through its MCP server

## Installation

1. Open Raycast
2. Search for "Store"
3. Search for "Timesheet"
4. Click Install

## Setup

Run any Timesheet command and sign in with your Timesheet account when Raycast asks.
That is all; there is nothing to copy or paste.

Sign out again from **My Profile → Sign out**.

### Using an API token instead

If you would rather not sign in interactively, for example on a shared machine or a
scripted setup, put an API token in the extension preferences and the sign-in is
skipped entirely:

1. Get your API token from [Timesheet Development](https://my.timesheet.io/development/apikeys)
2. Open Raycast Preferences → Extensions → Timesheet
3. Paste it into **API Token**

## Commands

| Command              | Description                                                 | Shortcut |
| -------------------- | ----------------------------------------------------------- | -------- |
| Start/Stop Timer     | Toggle timer for a project                                  | -        |
| Timer Status         | View current timer and today's stats                        | -        |
| My Projects          | Browse all projects                                         | -        |
| Today's Tasks        | List tasks logged today                                     | -        |
| Quick Log Time       | Manually log time                                           | -        |
| Add Note to Timer    | Add a note or screenshot to the running timer               | -        |
| Add Expense to Timer | Add an expense (with optional receipt) to the running timer | -        |
| Add Break to Timer   | Log a break on the running timer                            | -        |
| Todos                | Browse and close todos                                      | -        |
| Team Status          | See teammates currently tracking time                       | -        |
| Absences             | View absences in your organization                          | -        |
| My Profile           | View your account and plan                                  | -        |
| Timer Menu Bar       | Show timer in menu bar (macOS only)                         | -        |

## AI Extension

Type `@timesheet` in Raycast AI, or pick "Ask Timesheet" from root search, and ask
for what you need:

- "start tracking time on Website Redesign"
- "how much have I tracked today?"
- "stop my timer"
- "log 2 hours on Website Redesign starting at 9am"
- "what are my open todos?"
- "who on my team is working right now?"
- "is anyone off next week?"

Raycast AI reaches the extension through these tools:

| Tool                       | What it does                                   |
| -------------------------- | ---------------------------------------------- |
| Get Timer Status           | Current timer state plus today's total         |
| Start Timer                | Begin tracking a project, optionally backdated |
| Stop Timer                 | Close the running task                         |
| Pause Timer / Resume Timer | Take and end a break                           |
| List Projects              | Browse projects, or resolve a name to an ID    |
| List Time Entries          | Entries for a day or date range                |
| Log Time                   | Record finished work without a timer           |
| List Todos / Close Todo    | Browse todos and mark them done                |
| Get Team Status            | Who is tracking time right now                 |
| List Absences              | Holidays, sick leave and other absences        |

Every tool that changes something (start, stop, pause, resume, log, close) asks for
confirmation before it runs.

### Mention projects and todos

In AI Chat, type `@`, pick Timesheet, then **Projects** or **Todos** to put a project or
an open todo into your message. The AI receives its details and ID, so "log 2 hours on
@Website Redesign" needs no lookup.

### Timesheet MCP server

The extension also brings the hosted [Timesheet MCP server](https://mcp.timesheet.io)
into Raycast AI, for what the tools above don't cover: expenses, notes, breaks, tags,
rates, contracts, exports, reports and statistics. Raycast asks you to sign in to it the
first time the AI uses it, separately from the extension's own sign-in; an API token in
the preferences does not cover it.

## Menu Bar

The menu bar shows your current timer status:

- ▶ `1:25` - Timer running, in hours and minutes
- ⏸ `1:25` - Timer paused
- Timesheet icon only - No timer running

Click the menu bar icon to:

- Start a timer for one of your projects
- Pause, resume or stop the current timer
- Add a note, expense or break to the running timer
- See today's total time
- Open my.timesheet.io

## Keyboard Shortcuts (in Menu Bar)

| Shortcut | Action                |
| -------- | --------------------- |
| `⌘⇧P`    | Pause or resume timer |
| `⌘⌥S`    | Stop timer            |
| `⌘O`     | Open my.timesheet.io  |
| `⌘T`     | Open full timer view  |

## API

This extension uses the timesheet.io REST API through
[@timesheet/sdk](https://www.npmjs.com/package/@timesheet/sdk). The OpenAPI
specification is served at <https://api.timesheet.io/openapi.json>.

## Support

- [timesheet.io Docs](https://docs.timesheet.io/)
- [Contact us](https://timesheet.io/contact)

## License

MIT
