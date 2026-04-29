# mymind for Raycast

Search, save, and manage your [mymind](https://mymind.com) library
without leaving Raycast. Built against the official mymind API.

## Setup

1. Sign in to mymind on the web and open
   <https://access.mymind.com/extensions>.
2. Create an access key. mymind shows you the **Key ID** and a
   **Secret** — the secret is shown only once, copy it now.
3. In Raycast: open this extension's preferences, paste the Key ID into
   **Access Key ID** and the Secret into **Access Key Secret**.

That's it. Run **Search My Mind** to confirm the connection.

## Commands

| Command | What it does |
| --- | --- |
| **Search My Mind** | Grid/List view of your library with server-side semantic search. Use mymind's query syntax for power filters: `tag:foo`, `type:Note`, `domain:nytimes.com`, `"a phrase"`, `-exclude`. |
| **Add a New Note** | Quick markdown note with optional title and tags. |
| **Save to mymind** | One form, three behaviors. URL → web save; markdown → note; files → blob upload (≤64 MB). Auto-detects Finder selection, highlighted text, active browser tab, or clipboard URL. |
| **Quick Save URL** | No-view, single-keystroke URL save. Use as a Raycast Quicklink target with `{Browser URL}` for instant browser-tab capture. |
| **Browse Spaces** | List your spaces; drill in to see the cards inside each. |
| **Browse Tags** | List your tags; drill in to see all cards under a tag. |
| **mymind Menu Bar** | Count of today's saves in the menu bar with a quick-capture shortcut. Enable from Raycast Preferences → Extensions → mymind → Menu Bar. |

### Card actions

On any card you can:

- **Show Details** (Enter) — markdown body + metadata sidebar.
- **Find Related** (Cmd+Shift+R) — semantically related cards.
- **Edit Card** (Cmd+E) — edit title and markdown body.
- **Manage Spaces** (Cmd+Shift+S) — toggle the card in or out of any space.
- **Add Tags** (Cmd+Shift+T) — append new tags. (Tag removal still has to happen on the web app — the API doesn't expose it.)
- **Copy as Markdown** (Cmd+Shift+M).
- **Pin / Unpin** (Cmd+Shift+P / Cmd+Ctrl+P).
- **Open in Browser** (Cmd+Enter) and **Open in mymind** (Cmd+Shift+Enter).
- **Delete** (Cmd+Ctrl+X) — soft, recoverable for 30 days.

## Raycast AI

This extension also registers tools for Raycast AI. Try:

- "What did I save about prosemirror last month?"
- "Save https://anthropic.com to mymind under tag ai"
- "What tags do I use most?"

## Quicklink for instant browser-tab saves

If you want a one-keystroke "save the page I'm on" shortcut:

1. Raycast → Create Quicklink → choose **Run Raycast Command**.
2. Pick **Quick Save URL**.
3. In the URL argument, type `{Browser URL}` (a Raycast placeholder
   that resolves to the current browser tab).
4. Assign a global hotkey (e.g. ⌘⇧M).

Now anywhere in your browser, the hotkey saves that tab silently —
no Raycast UI opens.

## Known limitations

- **Recently Deleted** isn't yet exposed by the API, so there's no
  command to browse the trash. Restore is implemented internally and
  will surface as soon as listing is available.
- **Tag removal** still has to happen on the web app — the API
  exposes adding tags but no delete counterpart.

## Migrating from 1.x

The old extension authenticated by scraping JWT, CID, and Authenticity
Token cookies. 2.0 uses an official access key — generate one at
<https://access.mymind.com/extensions> and update preferences. The old
fields have been removed.
