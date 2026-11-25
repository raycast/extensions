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

## Browse a sprint
The "Sprint Work Items" command shows the work items of the current sprint (or any other one from the dropdown) in the same order and hierarchy as the Azure DevOps sprint backlog: User Stories first, with their Tasks below. Each row shows the state plus story points, estimated and completed hours when the process has those fields. Group by User Story or by state, switch between your items and the whole team, and filter states (show only / exclude); the sprint, grouping and filters are remembered.

Opening an item shows its parent, description, acceptance criteria, comments (images included), estimated, completed and remaining hours, assignee, iteration, tags, and links to its related work items, pull requests and commits.

"New Task" (Cmd+N) opens the work item form as a Task of that sprint, under the selected story (or the story of the selected task); every field can still be changed. From any item you can also add a comment, log hours (added on top of the latest totals in Azure DevOps), move it to another sprint, see its related work items, pull requests and commits with their branches, and copy its description or comments as Markdown or plain text.

## Search work items
The "Search Work Items" command finds any work item of the project set in the preferences, by number or by words in its title or description, with the same actions as Sprint Work Items.

## More actions on work items
My Work Items (list, details and children) also gets the new actions in their own sections at the end of the action panel, so the existing actions and shortcuts don't change: add a comment, log hours (only on types with a Completed Work field), move to another sprint (only for items of the project set in the preferences), show related work items, pull requests and commits, copy `| ID | Title`, and copy the description or comments as Markdown or plain text.

## Create work items
The "Create Work Item" command opens the same form as the "New Work Item" action of My Work Items, which is still there. Besides the existing fields, the form has these optional ones; left empty, the item is created as before:
- **Area**: any area path of the project.
- **Sprint** (only for the project set in the preferences): the current or an upcoming sprint.
- **Parent**: once a sprint is set, a picker of that sprint's backlog items; otherwise a work item ID, as before.
- **Estimate (hours)**: shown when the type has somewhere to keep it. It goes to the Custom Estimate Field when that preference is set and the type has it (the form shows the field's name, e.g. "Estimated Work"); otherwise to Original Estimate, with Remaining Work starting at the same value.

To fill the form faster, the "Create Work Item" command has optional defaults in its own preferences: Project, Type, Area (an area path such as `MyProject\MyTeam`, used for items of that project), Sprint (current sprint or none), Assignee (me or unassigned) and Create Branch (always or never). A field with a default is hidden from the form, and the defaults in use are listed at the top. The "New Work Item" action of My Work Items and "New Task" in Sprint Work Items don't use them and show every field.

## Optional preferences
- **Team**: whose sprints Sprint Work Items, Move to Sprint and the form's Sprint field use. Leave it empty to use the project's default team.
- **Custom Estimate Field**: the reference name of a custom field where your team keeps the estimate in hours, e.g. `Custom.EstimatedWork`. When set (and the type has it), it is used instead of Original Estimate. Leave it empty to use Original Estimate.

## Personal Access Token scopes
Each command only needs the scopes of the APIs it uses:

| Command | Scopes |
|---|---|
| Repositories Search | Code (Read) |
| Pipelines Search | Build (Read) |
| My Open Pull Requests, Open Pull Requests (menu bar) | Code (Read); the menu bar also needs Project and Team (Read) |
| My Open PBIs | Work Items (Read) |
| My Work Items, Create Work Item | Work Items (Read & Write); Code (Read & Write) to create branches |
| Sprint Work Items, Search Work Items | Work Items (Read & Write); Code (Read) to show linked pull requests and commits |
