# Pond

Search, save, and organize your [Pond](https://github.com/raphaelsalaja/pond) library from Raycast. Pond is a personal archiver for macOS that keeps the posts, links, images, and videos you save on your Mac. This extension talks to the Pond app over its local API, so nothing leaves your machine.

## Set up

You need macOS, Raycast, and the latest version of Pond.

1. [Install Pond](https://github.com/raphaelsalaja/pond/releases/latest), open it, and pick a library.
2. In Pond, open **Settings → Preferences**, then choose **Copy Token** under **Integrations → Raycast**.
3. Run any Pond command in Raycast and paste the token into **Local API Token**.

Keep Pond running while you use the extension. **Launch at Login** and **Launch in Background** in Pond Settings keep it ready without a window. If something's off, the extension tells you what happened and offers the one action that fixes it: open Pond, copy a new token, or update Pond.

Leave **Local API URL** at `http://127.0.0.1:41610/api/v2` unless you changed the port in Pond.

## Commands

| Command                | What it does                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| **Search Saves**       | Search by keywords or by meaning, filter by source, folder, tag, saved view, or Trash, then act.   |
| **Search Media**       | Browse your images and videos as a grid, with Quick Look.                                          |
| **Search Tags**        | Find a tag, see its saves, or open it in Pond.                                                     |
| **Search Folders**     | Find a folder by its full path and see what's inside.                                              |
| **Search Saved Views** | Open a saved view or smart folder from Pond.                                                       |
| **Open Random Save**   | Rediscover something you saved.                                                                    |
| **Save URL**           | Save a URL with tags and a folder, then watch Pond capture it.                                     |
| **Quick Save**         | Save without a form. Leave the URL empty to use your selection, browser tab, or clipboard.         |
| **Save Current Tab**   | Save the page open in Safari, Chrome, Arc, Brave, Edge, Chromium, or Vivaldi.                      |
| **Save Clipboard URL** | Save the URL on your clipboard.                                                                    |
| **Switch Library**     | Switch Pond to one of your recent libraries.                                                       |
| **Open Library**       | Bring Pond to the front.                                                                           |
| **Menu Bar**           | Recent saves, capture progress, and quick actions. It hides itself while Pond is closed.          |

### Search Saves

Type to search titles, descriptions, authors, tags, notes, and URLs. Press **⌘⇧B** to search by meaning instead, for ideas you remember but can't quote. The dropdown filters by source, folder, tag, saved view, untagged saves, saves outside any folder, or the Trash, and Raycast remembers your choice. With an empty search, the saves you opened last sit at the top.

Each save has a full action panel:

| Shortcut | Action                          |
| -------- | ------------------------------- |
| ↵        | Open in Pond                    |
| ⌘↵       | Open the original page          |
| ⌘Y       | Quick Look                      |
| ⌘⇧C      | Copy URL                        |
| ⌘⇧L      | Copy Pond link                  |
| ⌘⇧M      | Copy Markdown link              |
| ⌘⇧F      | Copy the image or file          |
| ⌘⇧T      | Copy the text Pond extracted    |
| ⌘T       | Add or remove tags              |
| ⌘L       | Add to or remove from a folder  |
| ⌘E       | Add or edit a note              |
| ⌃X       | Move to Trash                   |
| ⌘⇧R      | Show related saves              |
| ⌘⇧D      | Show or hide details            |
| ⌘R       | Refresh                         |

Edits show right away and roll back if Pond can't apply them. Moving to the Trash asks first, and you can restore from the Trash filter.

### Save URL

The form fills the URL from your selection, the page in your browser, or your clipboard, in that order. Pick existing tags, type new ones, and choose a folder. Drafts survive closing Raycast. **Create Quicklink with These Tags** turns your tag and folder choice into a one-keystroke Quick Save.

After you save, the extension follows the capture and shows when Pond has the thumbnail, caption, text in images, and transcript. Saving a URL that's already in Pond adds your tags and folder to the existing save.

The first time you save the current tab, macOS may ask to let Raycast control your browser. Allow it in **System Settings → Privacy & Security → Automation**. With the Raycast browser extension installed, the extension reads the tab from there instead.

## Raycast AI

Mention `@pond` in Raycast AI:

- `@pond find my typography references from Are.na`
- `@pond that article about software that feels calm`
- `@pond what does the transcript of that talk say about color?`
- `@pond save https://example.com/article and tag it reading`
- `@pond put these in my Fonts folder`
- `@pond switch to my Research library`

| Tool             | What it does                                                               |
| ---------------- | -------------------------------------------------------------------------- |
| Search Saves     | Search by keywords or meaning, with source, tag, folder, type, and dates. |
| Get Save         | Read one save's details.                                                   |
| Read Save Text   | Read a save's caption, text in images, transcript, and note.               |
| List Tags        | List your tags, most used first.                                           |
| List Folders     | List folders with their full paths.                                        |
| List Libraries   | List recent libraries.                                                     |
| Get Library Info | Read the active library's counts and capture queue.                        |
| Save URL         | Save a URL with tags and a folder.                                         |
| Edit Tags        | Add or remove tags.                                                        |
| Add to Folder    | Add saves to a folder or take them out.                                    |
| Move to Trash    | Move saves to the Trash.                                                   |
| Switch Library   | Switch Pond to another library.                                            |
| Open Save        | Open a save in Pond or its original page.                                  |
| Open Library     | Bring Pond to the front.                                                   |

Every change asks you first and names the saves it touches. Save IDs belong to one library, so after a switch, search again before changing saves.

The extension also registers Pond's built-in MCP server, which adds tools for exact text search, nested queries, and exports. Turn on the capabilities you want in **Pond Settings → Model Context Protocol**. If Pond isn't in `/Applications`, copy the path from **Pond Settings → Model Context Protocol → Advanced** into `ai.yaml`.

## Privacy

Commands and tools connect to Pond over `127.0.0.1`. Your token stays in Raycast's password storage and never appears in AI results. Thumbnails and Quick Look files are cached in the extension's support folder and trimmed automatically.

When you use Raycast AI, tool results go to the AI model you chose in Raycast. That can include titles, notes, and extracted text from your saves.

## Troubleshooting

| What you see             | What to do                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Pond isn't running       | Open Pond. Turn on Launch at Login to keep it ready.                                        |
| Token not accepted       | Copy the token again from Pond Settings. Rotating it in Pond replaces the old one.          |
| Pond needs an update     | Install the latest Pond. This extension needs Local API 2.1.                                |
| Save Current Tab fails   | Allow Raycast under Automation in System Settings, or use Save Clipboard URL.               |
| MCP tools are missing    | Turn on the capability in Pond Settings → Model Context Protocol, then reconnect in Raycast. |
