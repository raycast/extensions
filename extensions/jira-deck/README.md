# Jira Deck

Browse the Jira Cloud boards you pick, your issues and the backlog in a keyboard-first split view: issues on the left, the selected issue on the right. Boards with and without sprints both work.

## Setup

1. Create an API token at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Open any Jira Deck command. It asks for your Jira site (like `your-team.atlassian.net`), your email and the token. To change them later, open the extension's preferences.
3. To check the site, your sign-in and board access step by step, open **Test Connection** from the Extension section at the bottom of any command's actions (⌘K). It's also offered when Jira Deck can't connect.
4. Open **Board** and pick the boards you want to see. Boards from spaces you worked in lately are suggested first.

The token is stored by Raycast and only sent to your Jira site. Everything you see comes from what your Jira account can access: Jira only lists the boards, issues and spaces you have permission for.

A token without scopes works as is. For a token with scopes, pick these:

- `read:jira-user`, `read:jira-work` and `write:jira-work`
- `read:board-scope:jira-software`, `read:sprint:jira-software` and `write:sprint:jira-software`
- `read:board-scope.admin:jira-software`, optional: it lets boards show their columns. Without it, boards are grouped by status, Kanban boards include their backlog, and resolved issues (like Dropped or Won't Do) are left out after 14 days. Test Connection warns when it's missing.
- `read:project:jira`, `read:issue-details:jira` and `read:jql:jira`

Leave out the two `write:` scopes for a read-only token. Creating issues and changing assignees then won't work.

## Commands

| Command       | Shows                                                       |
| ------------- | ----------------------------------------------------------- |
| Board         | What a board is working on, grouped by status (see below)   |
| My Issues     | Open issues assigned to you                                 |
| Backlog       | Issues in a board's backlog                                 |
| Manage Boards | The boards you picked: pin, unpin, reorder, set the default |
| Create Issue  | A form for a new issue                                      |

## Shortcuts

| Shortcut | Action                                                |
| -------- | ----------------------------------------------------- |
| ↵        | Open in Jira                                          |
| ⌘↵       | Copy key                                              |
| ⌥⌘C      | Copy URL                                              |
| ⌘L       | Show linked work items                                |
| ⌘N       | Create issue                                          |
| ⇧⌘A      | Change assignee                                       |
| ⇧⌘I      | Assign to me                                          |
| ⌘B       | Switch between your pinned boards (Board and Backlog) |
| ⇧⌘B      | Manage boards                                         |
| ⌘.       | Pin or unpin a board                                  |
| ⌘D       | Make a pinned board the default                       |
| ⌥⌘↑ ⌥⌘↓  | Move a pinned board higher or lower                   |
| ⇧⌘F      | Filter by priority                                    |
| ⌘R       | Refresh                                               |
| ⌘T       | Test connection                                       |

## Boards

A space can have several boards, and sprints belong to a board. Jira Deck only shows the boards you pin, so a site with hundreds of boards stays usable.

- **Picking boards.** The first time Board or Backlog opens, it lists every board you can see, with boards from spaces you were assignee, reporter or watcher in over the last 30 days, or viewed lately, suggested at the top. ↵ pins a board and opens it, ⌘. pins it and stays, so you can pick several.
- **The default board.** Board and Backlog open the first pinned board. Make Default, Move Higher and Move Lower in Manage Boards change it. ⌘B switches between pinned boards, ⌘1 to ⌘9 in that menu.

Pins are stored on this Mac, per Jira site and email.

What Board shows depends on the board:

| Board                                                | Shows                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Sprint running                                       | The sprint's issues. Parallel sprints each get their own sections. |
| Between sprints                                      | The next planned sprint, then the backlog                          |
| No sprints (Kanban, or team-managed without sprints) | Open issues, plus issues done in the last 14 days                  |

The dropdown in the search bar filters Board and Backlog by assignee. Search matches the issue key or title. Long lists load 100 issues at a time as you scroll, and their count says "loaded" until the last one is in. Search and filters apply to the issues loaded so far.

The panel on the right shows the issue's details, from its summary down, including a sub-task's parent, and ends with its linked work items by relation, like "Is blocked by" or "Relates to", up to five each. Click one to open it in Jira. **Show Linked Work Items** (⌘L) lists all of them with their own details, so you can follow a chain of blockers. Open the issue in Jira to read its description.

Change Assignee lists only the people Jira lets you assign to that issue.

Create Issue asks for the summary and description first, then where the issue goes (space, type), who it's for (priority, assignee) and its context:

- **Sprint**: the backlog, the running sprint or a planned one, from the board you opened it from, a pinned board of the space, or the space's first scrum board. Opened from a running sprint, that sprint is picked.
- **Parent**: an open issue one level up in the space: an epic for a story, task or bug, a story, task or bug for a sub-task, and the level above epics if your site has one. Type in the dropdown to search by key or summary. Sub-tasks need one, and follow their parent's sprint.
- **Labels**: labels already used on your site. Raycast forms can't add new ones, so add those in Jira.
- **Due Date**.

**Assignee** offers you and the people who had issues on the space's board in the last 30 days, busiest first, so the list stays short. To assign someone else, continue in Jira or change the assignee after creating.

Each of these shows only when the issue type has the field. The description is limited to 200 characters. Spaces of your pinned boards come first in the Space dropdown. Opened while the list is filtered to one person, the issue is assigned to them.

**Create Issue** (⌘↵) creates it straight away. **Continue in Jira** (⌥↵) opens Jira's own create screen with the summary, description, type, priority and assignee filled in, for fields the form doesn't have; nothing is saved until you create it there. If the type needs a field the form doesn't have, the form says so.

Type the summary after "Create Issue" in root search to start with it filled in. After creating, the form clears the summary, description, labels and due date and keeps the rest, ready for the next issue.

## Priorities

Priorities are always shown with their name, next to an icon:

| Jira priority                             | Icon                              |
| ----------------------------------------- | --------------------------------- |
| Highest, Urgent, Blocker, Critical, P0    | Red circled up arrow              |
| High, Major, P1                           | Orange up arrow                   |
| Medium, Normal, P2                        | Yellow dash                       |
| Low, Lowest, Minor, Trivial, P3 and below | Blue down arrow                   |
| Anything else                             | Grey circle, with Jira's own name |

Names that mix both, like "P1 - High", count too.

## Development

```sh
npm install
npm run dev                          # live reload in Raycast
npm run lint                         # Raycast lint, ESLint, Prettier
npm run build -- -e dist -o ./dist   # production build without installing into Raycast
```
