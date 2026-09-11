# mymind

Search, save, upload, and organize your mymind library with the official mymind API.

## Setup

1. Open your mymind [Extensions page](https://access.mymind.com/extensions).
2. Create an API key with the access level you want to use.
3. Copy the **Key ID** into `Key ID`.
4. Copy **Your private key** into `Your Private Key`.
5. Choose the matching `Access Level` in Raycast:
   - `Read only` lets you browse your library.
   - `Full access` lets you save and edit items.

## Commands

- `Search mymind` searches your full library, supports type filters, and opens rich item details.
- `Search Spaces` browses your spaces, opens the items inside them, and lets you manage spaces.
- `Search Tags` browses your manual tags and the items inside each tag.
- `Save to mymind` saves links, notes, and files with optional tags, spaces, and attached notes.
- `Show mymind Menu Bar` adds quick save, search, spaces, and open-mymind actions to the menu bar.

## AI

This is an AI Extension: you can chat with your mymind library through Raycast AI by mentioning `@mymind`. For example:

- "@mymind find my saved articles about design"
- "@mymind save https://raycast.com with the tag tools"
- "@mymind write a note that says buy oat milk"
- "@mymind add the tag reading to the article about typography"
- "@mymind move that item into my Reading List space"
- "@mymind pin my latest note to Top of Mind"
- "@mymind delete that item"

The AI can call the following tools:

- `search-mymind` – search your library by keyword with an optional type filter.
- `get-object` – fetch the full details of a single item.
- `list-spaces` / `list-tags` – browse your spaces and manual tags.
- `list-space-colors` – list the fixed palette of colors (name and hex) that spaces support.
- `save-link` / `save-note` – save a URL or a Markdown note with optional tags and space.
- `create-space` – create a new space; a palette color is auto-assigned when you don't specify one, so creation never fails.
- `update-space` – rename or recolor an existing space using one of the palette colors (asks you to confirm first).
- `add-tags-to-object` / `remove-tags-from-object` – manage an item's tags.
- `move-object-to-space` – move an item into a space.
- `add-note-to-object` – attach a note to an item.
- `pin-object` / `unpin-object` – manage Top of Mind.
- `delete-object` – move an item to Recently Deleted.

Read tools work with any key. Tools that create, edit, move, tag, pin, or delete items require a **Full access** key, and the ones that change or delete existing items ask you to confirm before running.

## Features

- Browse your mymind library with the official API and mymind's ranking
- Filter results by type across search flows
- Save links, notes, images, PDFs, videos, markdown files, and other supported local files
- Add existing tags, assign a space, and attach notes while saving
- Start in file mode automatically when Raycast launches the command with selected supported files
- Upload multiple files at once and remove individual files before submitting
- Pre-fill from explicit launch context when available
- Rename items, retag them, move them between spaces, and edit notes
- Create, rename, recolor, and delete spaces
- Open richer detail views with previews, summaries, spaces, and tags
- Browse similar items when mymind provides related links
- Use a lightweight menu bar entry for quick access
