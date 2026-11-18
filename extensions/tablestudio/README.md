# TableStudio for Raycast

Search your [TableStudio](https://tablestudio.sh) connections, tables and views from Raycast and
open any of them straight in the app — and start or stop your local database servers without
leaving Raycast.

Requires [TableStudio for Mac](https://tablestudio.sh/download).

## Setup

1. In TableStudio: **Settings → Search & Launchers**.
2. Turn on **Find your databases from outside the app**.
3. Turn on **Raycast**.
4. Click **Connect Raycast**. That's it — the button opens the *Search Databases* command with
   everything filled in, and you land on your results.

Prefer to set it up by hand? TableStudio's settings has a *Set it up by hand instead* section with
the token and port; paste them into this extension's preferences.

## Commands

- **Search Databases** — your connections, tables and views in one list. Tables are searchable by
  their column names too, so `stripe_id` finds the table that has that column.
  What you open most often rises to the top of its section (*Reset Ranking* in the action panel
  puts an item back).
  - `↵` opens the item in TableStudio; `⌘⇧C` copies its `tablestudio://` deep link.
  - On a connection, `↵` **drills into just that connection's tables** and `⌘↵` opens it in
    TableStudio.
  - The dropdown on the right of the search bar narrows the list to one kind. Your choice is
    remembered.
- **Manage Local Databases** — the servers TableStudio runs on this Mac, with their live status.
  `↵` starts a stopped one or stops a running one. Only shows servers if you've turned on
  *Local databases* under **What to include** in TableStudio's settings.

The dropdown lists only the kinds TableStudio is publishing, which follows the *What to include*
toggles in its settings.

## Privacy

TableStudio serves your list from `http://127.0.0.1:<port>/launcher-catalog`, protected by a
token. Nothing leaves your Mac, and TableStudio writes nothing to disk for it.

The token is kept in the extension's local storage, which lives in Raycast's encrypted store.

### Offline access

The list is only available while TableStudio is running. The **Offline Access** preference (on by
default) keeps the last copy inside Raycast so search still works when the app is closed — those
results are marked *offline copy*, and opening one launches TableStudio and takes you there. Turn
it off to keep nothing at rest; the stored copy is deleted the moment you do.

## Also: MCP

Separately from this extension, TableStudio ships a local MCP server that Raycast AI can call
directly (`list_tables`, `execute_query`, …). Set it up from **Settings → MCP Server**, pick the
**Raycast** preset, and use the URL and header it shows in Raycast's *Manage MCP Servers →
Install New Server*.
