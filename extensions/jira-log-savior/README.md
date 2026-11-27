# Jira Log Savior

A local Raycast extension for Jira Cloud. It shows your worklogs by day in a Monday-first calendar and measures each day against a 7h 30m goal. Open a day to see the Jira issues you logged on and the total for each issue. Select an issue to open it in Jira.

## Setup

1. Install Raycast and Node.js 22.22.2 or later.
2. Open a terminal in this folder and run:

   ```sh
   npm ci
   npm run dev
   ```

3. Search Raycast for **Jira Log Savior**. Enter your site URL (for example, `https://example.atlassian.net`), Atlassian email and an [Atlassian API token without scopes](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/). Paste the token into Raycast's password preference.
4. Open the command again after saving the preferences.

`npm run dev` imports the extension into Raycast and watches the source for changes. [Raycast CLI documentation](https://developers.raycast.com/information/developer-tools/cli)

## Using the calendar

- **Enter** opens the selected date and shows the Jira issues, time logged and time left. Multiple entries for one issue are added together.
- **⌘⇧← / ⌘⇧→** switches months.
- **⌘T** goes to the current month.
- **⌘R** refreshes the current month after a Jira worklog changes.
- **⌘K** opens the actions menu.

Dates follow your Mac's time zone. The 7h 30m target applies to every calendar day. The extension reads your native Jira Cloud worklogs using your Jira permissions. Issue discovery uses Jira's worklog search index, so recently changed entries may take time to appear. Older entries on issues with very large worklog histories can be omitted by Jira's search index. [Jira search documentation](https://developer.atlassian.com/cloud/jira/platform/search-and-reconcile/) · [Jira worklog API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/)

Run `npm run check` to type-check or `npm run build` to build into `dist/`.
