# Kimai

Track time on your Kimai instance from Raycast, including multiple running timers, recent entries, time summaries, and menu bar controls. This is an independent integration, not an official Kimai product.

## Setup

1. Generate an API token in your Kimai user profile.
2. Enter your **Kimai URL** and **Kimai API Token** in the extension preferences. Use the URL you open in your browser, including any subdirectory, for example `https://kimai.example.com`. The token is stored as a password preference.
3. Open **Start / Stop Timers**, or use **Quickstart New Timer**. Select a project; the first available activity is selected automatically.
4. Run **Kimai Menu Bar** to enable the menu bar command. Raycast controls its background refresh schedule.

The integration uses Kimai 2.x's Bearer-token API. Actions are limited by your Kimai account permissions.

## Parallel timers

To run multiple timers, a Kimai administrator must open **System → Settings → Timesheet**, enable **Allow overlapping time entries**, and increase **Permitted number of simultaneously running time entries** to at least 2.

The extension checks these settings before starting or resuming a timer. If another timer is running and the server would replace it, the start is blocked. Resuming creates a new entry with the previous description, project, activity, and tags; it does not call Kimai's restart endpoint. The new entry uses current server billing defaults and does not copy custom fields or a billable override.

Server settings and the new entry are checked in separate API requests. Concurrent changes from other clients remain subject to Kimai's server rules. Stop All affects all of the current user's running timers, including those started outside Raycast. Partial failures report the IDs that could not be stopped.

## Commands

| Command | Function |
| --- | --- |
| Start / Stop Timers | Search recent entries, start, resume, edit, or stop individual timers |
| Quickstart New Timer | Start an entry with a description, project, activity, and tags |
| Quickstop Timer | Select which running timer to stop |
| Stop All Timers | Stop all running timers for the current user |
| Update Time Entry | Edit an entry's description, project, activity, and tags |
| Kimai Menu Bar | Show each running timer, stop timers, resume grouped recent entries, and view totals |
| Manage Customers | Create, rename, archive, restore, and delete customers |
| Manage Projects | Create and edit projects, change their customer, archive, restore, and delete |
| Manage Activities | Create and edit project or global activities, archive, restore, and delete |
| Manage Tags | List, create, and delete tags |
| Connection and Parallel Timer Settings | Inspect API connectivity and server tracking limits |

Management commands require the corresponding Kimai permissions. Deletions require confirmation and can be rejected for records in use. Edit dates, billing details, and custom fields in the Kimai web interface via **Open Kimai**.

## Display and totals

- Project-colored circle outlines identify entries.
- **Recent Entry Date Format** selects DD/MM/YYYY or Today / Yesterday / Date.
- **Show Summary in Start / Stop Timers** toggles the top row with Today, Yesterday, Week, and Month totals.
- Menu bar labels show each timer in H:MM, with descriptions shortened to 15 characters. The expanded menu keeps full descriptions.
- Matching recent entries are grouped by description, project, activity, and tags. Counts cover the latest 100 entries; selecting a group resumes its newest entry.

Totals use the computer's local timezone, a Monday-start week, and calendar months. Each entry is attributed in full to its start date. Stopped entries use Kimai's recorded duration; running entries use elapsed time until refresh. Parallel entries are summed independently, so totals can exceed wall-clock time. Summary history is paginated separately from the visible recent list.

## Refresh and errors

The open list refreshes every 30 seconds and after mutations; use ⌘R to refresh manually. Recent history loads 100 entries at a time with **Load Older Entries**. Search covers loaded entries. Running timers are fetched separately and are not limited to the history page.

Menu bar background refresh requests a 30-second interval, scheduled by Raycast. Its Refresh action and timer mutations refresh the data. The extension does not automatically retry writes; after a network timeout, refresh the list before starting again to avoid duplicates. It has no offline mode.

## Development

```sh
npm ci
npm run dev
```

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Tests cover API requests, parallel-timer safeguards, partial stop failures, date formatting, recent-entry grouping, project colors, summary boundaries, and pagination with a controlled HTTP transport. Automated tests do not validate a private Kimai deployment's permissions or configuration.

Local `.rayext` bundle import is currently restricted to internal Raycast builds. Standard Raycast users should install through the Store or import the source for local development.

## Attribution

The code is MIT licensed. The official Kimai logo is separately licensed under CC BY-SA 4.0; see [asset attribution](assets/ATTRIBUTION.md). The artwork is resized and padded for Raycast. Kimai is a registered trademark of Kevin Papst.

- [Kimai API setup](https://www.kimai.org/documentation/user-api.html)
- [Kimai server settings](https://www.kimai.org/documentation/configurations.html)
