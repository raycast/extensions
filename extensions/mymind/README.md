# Mymind

Search, save, upload, and organize your mymind library with the official mymind API.

## Setup

1. Open your mymind [Extensions page](https://access.mymind.com/extensions).
2. Create an API key with the access level you want to use.
3. Copy the `kid` into `Access Key ID`.
4. Copy the base64 secret into `Access Key Secret`.
5. Choose the matching `Access Level` in Raycast:
   - `Read only` lets you browse your library.
   - `Full access` lets you save and edit items.

## Commands

- `Search Mymind` searches your full library, supports type filters, and opens rich item details.
- `Search Spaces` browses your spaces, opens the items inside them, and lets you manage spaces.
- `Search Tags` browses your manual tags and the items inside each tag.
- `Save to Mymind` saves links, notes, and files with optional tags, spaces, and attached notes.
- `Show Mymind Menu Bar` adds quick save, search, spaces, and open-mymind actions to the menu bar.

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
