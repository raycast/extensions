# Azure DevOps Tasks for Raycast

View your assigned Azure DevOps work items and change their state without leaving Raycast.

## Features

- **My Work Items** — see everything assigned to you that's not closed
- Filter by type (Bug, Task, User Story, etc.) or project
- Change state directly from Raycast (uses the work item type's actual allowed states)
- Detail view with description, iteration, area path, tags, priority
- Quick actions: open in browser, copy ID/title/URL/markdown link

## Setup

### 1. Create a Personal Access Token (PAT)

1. Go to `https://dev.azure.com/{your-org}/_usersSettings/tokens`
2. Click **New Token**
3. Set scopes:
   - **Work Items**: Read & Write
4. Copy the token

### 2. Configure the extension

When you first run the command, Raycast will prompt for:

| Field            | Example                          |
| ---------------- | -------------------------------- |
| Organization     | `software-central`               |
| Default Project  | `Tenant Manager` _(optional)_    |
| Your Email       | `mark@softwarecentral.dk`        |
| PAT              | _(paste from step 1)_            |

Leave **Default Project** empty to see items across all projects you have access to.

## Development

```bash
npm install
npm run dev
```

Then run **My Work Items** from Raycast.

## Notes on State Transitions

Azure DevOps state machines depend on the **process template** (Agile, Scrum, Basic, CMMI) and the **work item type**. The extension fetches the actual allowed states for each item dynamically — so a Bug in an Agile project will offer New/Active/Resolved/Closed, while a Task in Scrum offers To Do/In Progress/Done.

Some transitions are blocked by Azure DevOps rules (e.g. you can't always go directly from New → Closed). If the API rejects a transition, you'll see the exact error from Azure DevOps in the toast.
