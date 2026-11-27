# Scoped Search

Search only inside the folders you choose, with a configurable depth limit. No whole-disk scanning, no index.

## Commands

- **Scoped Search** lists the folders and/or files inside your configured search folders. Use the dropdown to limit results to a single folder.
- **Manage Search Folders** adds, removes, pauses, and reorders the folders that are searched. You can open it from Scoped Search with `⌘⇧M`.

## Actions

Open in Finder, Open in Terminal, Open in Editor, Copy Path, and more on every result.

## Preferences

| Preference | Default | Description |
| --- | --- | --- |
| Search Depth | 1 level | How many levels below each search folder to include, or Unlimited. |
| Include | Folders only | Folders, files, or both. |
| Include hidden items | Off | Include entries whose name starts with a dot. |
| Exclude Names | `node_modules, .git, …` | Names that are skipped and not descended into. |
| Terminal App / Editor App | – | Apps used by the "Open in Terminal" and "Open in Editor" actions. |
| Result Limit | 5000 | Safety cap on how many entries are loaded. |
