# Dazzi for Raycast

Search what Dazzi has indexed and ask Dazzi's AI Search without switching to the app.

| Command | What it does |
| --- | --- |
| **Search Dazzi** | Searches your files, mail, chats, and web history through Dazzi's own retrieval (`autorag lite retrieve`), with no chat model. If Dazzi's config enables reranking (Dazzi account models do), the candidate passages are sent to that rerank service; otherwise the search stays on your Mac. ↵ opens a file, ⌘↵ shows it in Dazzi; Show in Finder and Quick Look are in the action panel, and a web page opens in the browser. ⌘⇧↵ asks Dazzi the same text with the selected file attached. |
| **Ask Dazzi** | Sends the question to Dazzi, which answers it in a new AI Search tab. |
| **Ask Dazzi About Selected Files** | The same, with the files selected in Finder attached to the question. |
| **Open in Dazzi** | Opens the folders selected in Finder in Dazzi, and shows selected files in their folder. |

## Requirements

- The [Dazzi](https://github.com/NomaDamas/AutoRAG-app/releases/latest) macOS app, version 0.3.1 or later (Apple Silicon), installed in `/Applications` or `~/Applications`. The extension does nothing without it. A copy elsewhere can be chosen under **Dazzi Application** in the extension preferences. An older Dazzi still runs Search Dazzi and Open in Dazzi; the two Ask commands show "Update Dazzi".
- At least one folder or source indexed in Dazzi. Search Dazzi reads that index; it does not build one.
- The commands that read the Finder selection ask once for permission to control Finder.

## How it works

The extension only uses what the Dazzi app bundle ships:

- `Dazzi.app/Contents/Resources/bin/dazzi` is the `dazzi` command. `--ask QUESTION [--] [path...]` asks AI Search and `[--] path...` opens or reveals paths. A running Dazzi receives the request over its local socket; if Dazzi isn't running, the command starts it.
- `Dazzi.app/Contents/Resources/tools/bin/autorag lite retrieve --json` is Dazzi's bundled librarian. It searches the same index the app keeps, with the app's tools first on `PATH`, the same way the app runs them.
