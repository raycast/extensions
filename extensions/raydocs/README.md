# Raycast Docs

Search Raycast's developer documentation, preview any page inline, and jump to the source
when you need it. The list is parsed live from the [`raycast/extensions`](https://github.com/raycast/extensions)
table of contents, cached locally and refreshed whenever the fetch succeeds — grouped by section, filterable
by a dropdown, and ordered so your most-opened pages sit at the top of their section.

## Actions

Read and Open in Browser are the list's first two actions, so they run on Return and
⌘ Return; once you're reading a doc, Open in Browser becomes the primary (Return) action.

| Action                | Shortcut | Where             |
| --------------------- | -------- | ----------------- |
| Copy URL to Clipboard | ⌘ ⇧ C    | List item, Detail |
| Copy Markdown URL     | ⌘ ⌃ C    | List item, Detail |
| Copy as Markdown      | ⌘ ⇧ M    | List item, Detail |
| Refresh Docs          | ⌘ R      | List item         |

## AI Tools

Ask Raycast AI things like "what's the file structure of an extension?" and it can call:

- **Get Links** — the full list of documentation entries.
- **Get Link Content** — the markdown for a given doc, by its raw GitHub URL.
