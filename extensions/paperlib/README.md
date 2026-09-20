# Paperlib for Raycast

Search the papers in your [Paperlib](https://github.com/Future-Scholars/paperlib) library from Raycast. Open a result to read the title, authors, and abstract, then copy a DOI, a formatted citation, or BibTeX.

This is a Raycast extension, not a Paperlib plugin. It talks to a running Paperlib app through the official **API Host** extension.

## What you can do

From **Search Papers**:

- Type to search title, authors, venue, notes, and DOI
- Read title, authors, and abstract in the detail pane
- **Open PDF** (`⌘O`) — opens the file at `mainURL` in the default PDF viewer (not Paperlib)
- **Open Web Link** (`⌘⇧O`) — DOI, otherwise arXiv, otherwise a recorded http(s) URL
- **Copy Web Link** (`⌘⇧L`)
- **Copy DOI** (`⌘D`)
- **Copy Citation** (`⌘⇧C`) — APA by default, Harvard optional
- **Copy BibTeX** (`⌘⇧B`)
- **Copy Citation Key** (`⌘⇧K`) — same `authorYearTitle` keys Paperlib generates

## How it connects to Paperlib

Paperlib keeps the library in a local Realm database:

| Location | Path |
| --- | --- |
| Default library folder | `~/Documents/paperlib` |
| Database file | `~/Documents/paperlib/default.realm` |
| Preferences | Electron `config.json` in the Paperlib user-data directory |

Realm files are not readable from Raycast (native engine, and Paperlib often holds a lock). The supported live path is Paperlib's own HTTP RPC:

```
http://127.0.0.1:21227/PLAPI.paperService.load/?args=[...]
```

That endpoint is provided by [`@future-scholars/paperlib-apihost-extension`](https://github.com/Future-Scholars/paperlib-apihost-extension), which Paperlib documents as the way to connect Raycast, Alfred, and similar tools. This extension:

1. Pings the API Host
2. Searches with the same Realm `LIKE[c]` query sentence Paperlib uses in general search
3. If the host is down, reads a JSON or CSV export you point at in preferences
4. If nothing else is available, loads a built-in demo library so the command still works in CI and first-run demos

Paperlib paper records do **not** store abstracts (only notes). The detail pane shows a note when that is all the library has, and can fill a missing abstract from Crossref or arXiv.

## Install and run

You need [Raycast](https://www.raycast.com) (macOS or Windows) and [Node.js](https://nodejs.org) 20+.

```bash
git clone <this-repo>
cd paperlib-raycast
npm install
npm run dev
```

`npm run dev` starts Raycast's developer tools (`ray develop`). Open Raycast and run **Search Papers**. Saving TypeScript files reloads the command.

To use your real library:

1. Install [Paperlib](https://paperlib.app) and open it.
2. Preferences → Extensions → install **`@future-scholars/paperlib-apihost-extension`**.
3. Leave Paperlib running. Confirm `http://127.0.0.1:21227/` in a browser prints that the API Host is running.
4. In Raycast, open the extension preferences if you changed the API Host port.

Without Paperlib, leave **Use demo library when Paperlib is offline** enabled, or set **Library JSON or CSV** to an export. Paperlib's CSV export (`title,authors,doi,...`) is accepted. A JSON array of paper objects is accepted too.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Load the extension in Raycast developer mode |
| `npm test` | Unit tests for search, API RPC, citations, and fallbacks |
| `npm run build` | Package the extension with `ray build` |
| `npm run lint` | Raycast ESLint rules (`ray lint`) |

Raycast itself is not available in headless CI. Tests cover the library client against a fake API Host and the demo/local fallbacks; they do not launch the Raycast UI.

## Preferences

| Preference | Default | Purpose |
| --- | --- | --- |
| Paperlib API Host | `http://127.0.0.1:21227` | API Host base URL |
| Library JSON or CSV | empty | Offline export |
| Paperlib Library Folder | `~/Documents/paperlib` | Looks for `library.json` / `papers.csv` |
| Use demo library | on | First-run / CI fallback |
| Fetch abstracts | on | Crossref / arXiv when Paperlib has no abstract |
| Citation style | APA | Plain-text copy format |
| Result limit | 50 | Cap on results shown in Raycast |

## Development notes

Citation keys and BibTeX follow Paperlib's `ReferenceService` (`family + year + first meaningful title word`, conference papers as `@inproceedings`). Live export through `PLAPI.referenceService` is available from the API Host; this extension generates the same formats locally so copy actions work for demo and JSON fallbacks too.

Set `PAPERLIB_DEMO=1` to force the demo library even if other sources exist.

## Opening PDFs and links

`Open PDF` reads `mainURL` from the Paperlib record. Relative paths are joined with the library folder (`appLibFolder` from the API Host, or **Paperlib Library Folder** in preferences, default `~/Documents/paperlib`). Absolute and `file://` paths are used as-is. The file is opened with the OS default handler for `.pdf` — Paperlib is not launched.

If `mainURL` is empty, remote (`https://`, `webdav://`, …), or the file is missing on disk, Raycast shows an error toast instead of opening anything.

`Open Web Link` / `Copy Web Link` use, in order: DOI (`https://doi.org/…`), arXiv (`https://arxiv.org/abs/…`), then an http(s) URL stored on the record. Demo papers have DOIs so the web actions work; they have no local PDFs, so **Open PDF** errors until you connect a real library.
