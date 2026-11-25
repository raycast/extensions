# Search Azure DevOps repositories based on the organization
Find a repository quickly, see which branch is default or copy the .git URL.

## Open Azure DevOps Pull Requests quickly
It is easy to see and open all pull requests via the menu bar.

## Find and open your own pull requests
Find and open your own pull requests quickly.

## Find and open your own PBIs
Find and open your own PBIs (Product Backlog Items) quickly.

## Find and open pipelines
Find and open pipelines based on your Azure DevOps organization and project.

## Manage your work items
Browse work items assigned to you across projects, filter and group them by state, type or project, and change state on a single item or many at once. By default the list shows only items assigned to you; you can turn that off in settings to browse everyone's items (a project, state, or type filter is required to keep the result set bounded), with each item's assignee shown in the list. View descriptions with inline images plus acceptance criteria, repro steps, comments and attachments, create new work items, and create branches linked to a work item.

> The "My Work Items" command needs a Personal Access Token with **Work Items (Read & Write)** and **Code (Read & Write)** scopes (the latter for branch creation).

## Browse a sprint
The "Sprint Work Items" command shows the work items of the current sprint (or any other one from the dropdown) in the same order and hierarchy as the Azure DevOps sprint backlog: User Stories first, with their Tasks below. Each row shows the state plus story points, estimated and completed hours when the process has those fields. Group by User Story or by state, switch between your items and the whole team, and filter states (show only / exclude); the sprint, grouping and filters are remembered.

From any item you can add a comment, log hours (added on top of the latest totals in Azure DevOps), move it to another sprint, see its related work items, pull requests and commits with their branches, and copy its description or comments as Markdown or plain text.

Both settings below are optional:
- **Team**: whose sprints are shown. Leave it empty to use the project's default team.
- **Custom Estimate Field**: a custom field used as the estimate when Original Estimate is empty (e.g. `Custom.EstimatedWork`).

> The "Sprint Work Items" command needs a Personal Access Token with **Work Items (Read & Write)** and **Code (Read)** scopes (the latter to show linked pull requests and commits).
