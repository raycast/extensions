# gh Usage

A Raycast extension that shows your GitHub API rate limit usage at a glance.

GitHub's API allows a certain number of requests per hour for each resource type (REST, GraphQL, Search, etc.). This extension lets you see how many requests you've used, how many you have left, and when your limits reset, without leaving Raycast.

## Requirements

- [Raycast](https://raycast.com)
- [GitHub CLI (`gh`)](https://cli.github.com) installed and authenticated (`gh auth login`)

## Commands

**gh Usage** Opens a full list view showing all rate limit resources. Each row displays how much of your limit you've used, how much remains, and when the limit resets. Select a row to see full details in the side panel.

**gh Usage Menu Bar** Adds a persistent item to your macOS menu bar showing how many Core API requests you have remaining. Click it for a breakdown of all resources. Turns into a warning icon when you've used 80% or more of your Core limit.

**gh Usage Stats** Runs in the background on a schedule and updates the subtitle shown next to the command in Raycast's launcher.

## Settings

### Extension (all commands)

| Setting | Description | Default |
|---|---|---|
| Refresh Interval | How often to re-fetch rate limit data | 1 minute |
| Custom gh Path | Path to the `gh` binary if not found automatically | — |

### gh Usage Menu Bar

| Setting | Description | Default |
|---|---|---|
| Displayed Resource | Which resource drives the count shown in the menu bar title | Core (REST API) |
| Menu Bar Title Template | Template for the menu bar title | `GH {warning}{remaining}` |

#### Menu bar title placeholders

These placeholders refer to whichever resource is selected in **Displayed Resource**:

| Placeholder | Value |
|---|---|
| `{remaining}` | Requests remaining |
| `{used}` | Requests used |
| `{limit}` | Request limit |
| `{pct}` | % used |
| `{warning}` | `⚠ ` when ≥ 80% used, otherwise empty |

All resource-specific placeholders from the table below are also available.

Example: `GH {remaining}/{limit}`

### gh Usage Stats

| Setting | Description | Default |
|---|---|---|
| Subtitle Template | Template string shown as the command subtitle in the Raycast launcher | `Core: {coreRemaining} remaining · {corePct}% used` |

#### Subtitle placeholders

| Placeholder | Value |
|---|---|
| `{coreRemaining}` | Core API requests remaining |
| `{coreUsed}` | Core API requests used |
| `{coreLimit}` | Core API limit |
| `{corePct}` | Core API % used |
| `{graphqlRemaining}` | GraphQL requests remaining |
| `{graphqlUsed}` | GraphQL requests used |
| `{graphqlLimit}` | GraphQL limit |
| `{graphqlPct}` | GraphQL % used |
| `{searchRemaining}` | Search requests remaining |
| `{searchUsed}` | Search requests used |
| `{searchLimit}` | Search limit |
| `{searchPct}` | Search % used |
| `{codeSearchRemaining}` | Code Search requests remaining |
| `{codeSearchUsed}` | Code Search requests used |
| `{codeSearchLimit}` | Code Search limit |
| `{codeSearchPct}` | Code Search % used |
| `{integrationRemaining}` | Integration Manifest requests remaining |
| `{integrationUsed}` | Integration Manifest requests used |
| `{integrationLimit}` | Integration Manifest limit |
| `{integrationPct}` | Integration Manifest % used |

Example: `Core: {coreRemaining} · GraphQL: {graphqlRemaining} · Search: {searchRemaining}`
