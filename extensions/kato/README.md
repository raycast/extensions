# Kato for Raycast

Kato for Raycast is the fast action layer for your Kato workspace. Search work,
capture tasks, manage your assigned work, and jump into meetings without opening
the full Kato app.

## Connect

1. Install the extension from the Raycast Store or import this directory while developing.
2. Run any Kato command.
3. Choose **Connect Kato**, sign in in your browser, select a workspace, and approve access.
4. Return to Raycast. No token or client secret needs to be copied.

OAuth access is personal and workspace-specific. Kato uses authorization-code +
PKCE, short-lived access tokens, and rotating refresh tokens. Use **Current
Workspace** to inspect the active workspace or switch to another one; you can
also disconnect from Raycast's extension preferences.

## Commands

- **Search Workspace** searches tasks, records, and meetings. An empty query shows urgent tasks, recent records, and the next meetings.
- **Objects** browses every workspace object and opens a clean record list using each record's primary display name.
- **My Day** combines overdue and due-today tasks, current and upcoming meetings, and unread notifications.
- **My Tasks** groups assigned work into Overdue, Today, Upcoming, and Unscheduled, with complete, Undo, inline updates, edit, comment, and detail actions.
- **Create Task** supports description, due date, priority, status, estimate, assignees, linked records, linked meetings, and sections.
- **Upcoming Meetings** groups your schedule and makes Join Meeting the primary action when available.
- **Notifications** triages mentions, assignments, task updates, and record activity with optimistic read and dismiss actions.
- **Current Workspace** shows the active workspace and reconnects OAuth to switch workspaces.

Records and meetings remain read-only. The extension can create and fully edit
tasks, link tasks to records and meetings, and add activity comments to tasks,
records, and meetings. Kato applies the same permissions, workflows,
notifications, and activity side effects as the web app.

## Development

```sh
npm install
npm run dev
```

Before a release:

```sh
npm test
npm run lint
npm run build
```

The production endpoints are `https://app.getkato.io/oauth/authorize` and
`https://api.getkato.io`. Publishing with `npm run publish` opens a review PR in
the public Raycast extensions repository.
