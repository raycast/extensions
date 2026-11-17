# Tolaria for Raycast

Search a [Tolaria](https://tolaria.md) vault by file name **and** file content, then open the result directly in Tolaria.

## Features

- Searches file names / paths and file content (multi-word queries match files containing every word).
- Fuzzy, accent-insensitive file name matching: `mdf` → `Marché_du_Film/…`, `hbrgmnt aws` → `Hébergement_AWS.md`. Results are ranked by match quality (exact > word boundaries > scattered letters).
- Results grouped into **File Name Matches** and **Content Matches**, with a snippet of the matching line.
- Opens notes in Tolaria using its `tolaria://<vault-slug>/<relative-path>` deep links.
- Vault switcher in the search bar (reads Tolaria's registered vaults).
- Markdown preview (`⌘⇧P`), Show in Finder, Copy Deep Link, Copy Path.

## Preferences

| Preference | Description |
| --- | --- |
| Vault Folder | Folder to search. Empty = Tolaria's active vault. |
| File Extensions | Comma-separated extensions to include (default `md,markdown,txt`). |
| Search inside file content | Toggle content search. |
| Fuzzy file name matching | Toggle fuzzy matching (off = exact substring only). |

Opening in Tolaria requires the folder (or a parent folder) to be registered as a vault in Tolaria.

## Development

```bash
npm install
npm run dev
```
