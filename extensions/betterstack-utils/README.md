# BetterStack Utils

View your BetterStack on-call schedule and manage incidents directly from Raycast.

![betterstack-schedule.png](docs/betterstack-schedule.png)

[Betterstack Raycast Demo](docs/betterstack-raycast.mp4)

## Features

- View your BetterStack primary on-call schedule in Raycast.
- Open the schedule directly in BetterStack with the **Open Schedule in Browser** action.
- Create new incidents with summary, description, requester email, and notification preferences.
- List active incidents and acknowledge, resolve, or open them in the browser.

## Commands

### On Call Schedule

Shows who is currently on call and a visual grid of the primary schedule. Supports monthly and weekly views with
navigation between periods. A monthly summary shows how much time each team member has been on call.

- **Toggle View** — switch between monthly and weekly schedule views.
- **Previous / Next Period** — navigate backward or forward through the schedule.
- **Back to Current** — jump back to the current period.
- **Filter by User** — focus the schedule on a specific team member.
- **Clear Filter** — remove the active user filter.
- **Copy Schedule** — copy the current schedule view as an image to your clipboard.
- **Open Schedule in Browser** — open the on-call schedule in BetterStack (requires Team ID).
- **Refresh** — reload the schedule.

### Create Incident

File a new BetterStack incident. Fill in a summary (required), an optional description, and a requester email. Choose
whether to notify the on-call team member via email, SMS, or phone call.

### Manage Incidents

View and manage incidents. Use the dropdown to switch between **Active** and **All** incidents. For each incident you
can:

- **Acknowledge** — acknowledge a started incident.
- **Resolve** — mark an incident as resolved.
- **Open in Browser** — open the incident in BetterStack.
- **Create Incident** — create a new incident without leaving the list.
- **Refresh** — reload the incident list.

## Setup

### Required setup

This extension requires a BetterStack API token.

1. Go to [BetterStack Global API Tokens](https://betterstack.com/settings/global-api-tokens)
2. Create a new token (or copy an existing one)
3. Paste the token into the **API Token** field when prompted by Raycast

### Open BetterStack in the browser

To enable the actions that open Betterstack in the browser like the **Open Schedule in Browser** action, configure the
optional **Team Id** preference in Raycast.

1. Open your on-call schedule in BetterStack.
2. Copy the numeric team ID from the URL: `https://uptime.betterstack.com/team/t{id}/oncalls`
3. Paste only the numeric `{id}` value into the **Team Id** field in this extension's settings.

For example, if your URL is `https://uptime.betterstack.com/team/t12345/oncalls`, enter `12345`.

### Default requester email

To pre-fill the **Requester Email** field when creating incidents, set the optional **Requester Email** preference in
Raycast to your email address.
