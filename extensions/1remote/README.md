# 1Remote for Raycast (Windows)

Search, connect to, edit, duplicate and delete your [1Remote](https://github.com/1Remote/1Remote) connections from Raycast.

## Commands

- **Search Connections**: lists all connections, most recently used first, with a tag filter.
  - `Enter` connects through `1Remote.exe ULID:<id>`. If 1Remote is already running, the request goes to that instance.
  - `Ctrl+E` edits name, address, port, user, domain, tags, note and color.
  - `Ctrl+D` shows or hides the details pane (the note is rendered as Markdown).
  - Also included: connect every connection that has a given tag, copy address or user name, duplicate, delete.

## How it works

- `1Remote.exe` is found automatically unless you set it in the preferences. It tries, in order: the "start with Windows" registry entry, the usual install folders, the running 1Remote process, desktop and Start Menu shortcuts, and `PATH`. The path it finds is saved for next time.
- Reads the 1Remote SQLite database (`Servers` table) using Node's built-in `node:sqlite`. No native dependencies.
- The database path comes from `1Remote.json` (`SqliteDatabasePath`). The portable folder is checked first, then `%APPDATA%\1Remote`. You can override it in the preferences.
- After each write it sets `Configs.UpdateTimestamp_Servers`. 1Remote checks that value every ~20 s (`DatabaseCheckPeriod`) and reloads its list.
- Passwords are encrypted with 1Remote's own key, so they are never read or changed. Duplicating a connection copies the encrypted value as is, which still works because it is the same database.

## Limitations

- Only the local SQLite database is supported. Additional data sources (`1Remote.dataSources.json`, MySQL) are ignored.
- Protocol-specific settings and credentials have to be edited in 1Remote.

## Development

```sh
npm install
npm run dev     # loads the extension into Raycast in development mode
```
