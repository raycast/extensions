# Link Commands

Quicklinks as real files.

Raycast Quicklinks live in an encrypted local database. You cannot grep them, diff them, put them under version control or sync them between machines — and you cannot group them beyond one flat list.

Script Commands are ordinary files in a folder you own. This extension turns any link, folder or search into one, fills in its icon and metadata, and then browses them grouped by **environment**, **package** and **category**.

## Commands

### Create Link Command

Give it a title and a target. It writes the script, makes it executable, and fetches the site's icon into your script directory so nothing hotlinks.

A target can be:

| Target   | Example                                               |
| -------- | ----------------------------------------------------- |
| A URL    | `https://www.netflix.com`                             |
| A folder | `~/Downloads`                                         |
| A search | `https://en.wikipedia.org/w/index.php?search={query}` |

Put `{query}` anywhere in a URL and Raycast prompts for the value, percent-encoded — so a search containing `&` does not lose half its terms.

**Open With** binds the link to one application, the same way a Quicklink can.

### Search Link Commands

Lists the link commands in your script directories, ordered by package so everything belonging to one service sits together. Filter by environment, category or package; the detail pane shows the target, the app it opens in and the argument it prompts for.

Commands that do more than open a target are not listed — those are scripts, and Raycast's own Script Commands list is the place for them.

## The convention

Script Commands give you two strings — a title and a `packageName` shown as the subtitle — and no fields for scope, brand or category. This extension reads three axes out of those two strings:

| Title                  | packageName        | Means                           |
| ---------------------- | ------------------ | ------------------------------- |
| `Netflix`              | `Netflix · #media` | package Netflix, category media |
| `Watch Later`          | `YouTube · #media` | a sub-page of YouTube           |
| `@work · Abacus Board` | `Jira`             | scoped to the work environment  |

- **`@environment · `** leads the title. It gets its own section in the list, so a work link never sits silently among personal ones.
- **`· #category`** trails the subtitle rather than the title, because Raycast renders titles in full and metadata in the title is metadata in the column you read for content.
- **The package** is the app or service — `YouTube`, `The Orchard`, `npm`.

None of it is required. A command written by someone who has never seen this parses fine — it simply has no environment and no category, and its package is whatever the field holds.

The **Create Link Command** form offers the environments and categories already present in your own commands, with a _New…_ escape, so the vocabulary stays yours. It also learns package names: once a link to `theorchard.atlassian.net` is filed under `Jira`, the next one suggests `Jira` rather than `Atlassian`.

## Preferences

| Preference                  | What it does                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Script Directories**      | The folders holding your Script Commands. Raycast keeps its own list in an encrypted database that no extension can read, so the paths have to be entered here as well. |
| **Grouping**                | Read the convention out of titles and subtitles to build sections and filters. Off, everything is one flat list.                                                        |
| **Detail Pane**             | Show a link's source as well as its target. Off by default — a link command's body is a single `open` call and its header repeats the metadata beside it.               |
| **Terminal**                | The application used by _Run in Terminal_, for when a command misbehaves and you need to see its errors.                                                                |
| **Author** / **Author URL** | Written into the `@raycast.author` headers of commands you create.                                                                                                      |
