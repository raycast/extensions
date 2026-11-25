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

## Search work items
The "Search Work Items" command finds any work item of the project set in the preferences, by number or by words in its title or description, with the same actions as Sprint Work Items.

## More actions on work items
My Work Items (list, details and children) also gets the new actions in their own sections at the end of the action panel, so the existing actions and shortcuts don't change: add a comment, log hours (only on types with a Completed Work field), move to another sprint (only for items of the project set in the preferences), show related work items, pull requests and commits, copy `| ID | Title`, and copy the description or comments as Markdown or plain text.

## Create work items
The "Create Work Item" command opens the same form as the "New Work Item" action of My Work Items (which is still there). For the project set in the preferences, the form can also plan the item in a sprint, pick its parent from that sprint's backlog items, and set an estimate in hours (Original Estimate, or the Custom Estimate Field when the type has no Original Estimate). The form also has an optional Area field listing the project's area paths. All of these are optional; left empty, the item is created as before.

The estimate goes to the Custom Estimate Field when it is set in the preferences and the type has it (the form shows that field's name, e.g. "Estimated Work"); otherwise to Original Estimate.

To fill the form faster, the "Create Work Item" command has optional defaults in its preferences: Project, Type, Area (an area path such as `MyProject\MyTeam`, used for items of that project), Sprint (current sprint or none), Assignee (me or unassigned) and Create Branch (always or never). A field with a default is hidden from the form, and the defaults in use are listed at the top. The "New Work Item" action of My Work Items doesn't use them and always shows every field.
