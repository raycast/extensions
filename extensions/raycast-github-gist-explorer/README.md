# GitHub Gist Explorer

A Raycast extension for searching, previewing, creating, deleting, and pasting your GitHub gists.

When you open a command for the first time, Raycast prompts you to sign in with GitHub in your browser. The extension uses GitHub OAuth with `gist` access and stores the token securely through Raycast.

## Setup

No manual personal access token setup is required.

1. Open any command from the extension in Raycast.
2. Sign in with GitHub when Raycast opens the browser-based OAuth flow.
3. Approve access to your gists.
4. Return to Raycast and start searching or creating gists.

The extension requests GitHub access with the `gist` scope only.

## Privacy and Local Data

The extension stores a local cache on your machine so searches stay fast and available immediately when the command opens.

The local cache includes:

- normalized gist metadata
- search documents built from filenames, descriptions, and indexed file content
- sync metadata used to rebuild the search index

This cached data is only used by the extension to power search, preview, and refresh behavior inside Raycast.

## What It Does

- Indexes your gists locally for fast filename, description, and content search
- Refreshes gists in the background when `Search Gists` opens, so removals and edits get picked up automatically
- Shows search results with the primary filename first and the gist description second when available
- Opens an in-Raycast preview for each gist, with content on the left and gist metadata on the right
- Lets you paste gist content directly into the active app from the preview
- Supports creating new gists and manually rebuilding the local index
- Supports deleting gists directly from Raycast

## Commands

### Search Gists

Use this as the main entry point.

- Loads cached results first for responsiveness
- Starts a background refresh on open and updates the list when sync completes
- Searches across filenames, descriptions, and file contents
- Ranks filename matches above description matches, and description matches above content matches
- Shows recent gists when the search field is empty

Result actions:

- `Enter`: open gist preview
- `Ctrl+Enter`: show the gist on GitHub
- `Copy Gist URL`: copy the GitHub URL
- `Delete Gist`: permanently delete the gist from GitHub

Preview actions:

- `Enter`: paste gist content into the active text field and copy it to the clipboard
- `Ctrl+Enter`: show the gist on GitHub
- `Copy Gist URL`: copy the GitHub URL
- `Delete Gist`: permanently delete the gist from GitHub

For multi-file gists, the list title uses the first filename and shows `(+N more)` when additional files exist.

### Create Gist

Creates a new gist from Raycast.

- Set description, filename, content, and visibility
- Uses the GitHub Gists API directly

### Refresh Gists

Rebuilds the local gist content index on demand.

- Fetches your current gists from GitHub
- Loads full gist details so content search works reliably
- Optionally fetches full raw content for truncated files

## Preferences

The extension defines these Raycast preferences:

- `fetchFullTruncatedContent`: when enabled, fetches raw content for truncated gist files during indexing

## How Search Works

Search is gist-level rather than file-level. Each gist is indexed using:

- filenames
- description
- file contents

Content search depends on the local index, so newly edited or deleted gists appear after the background refresh or after running `Refresh Gists` manually.

## Project Structure

- `src/search-gists.tsx`: main search UI, preview flow, and paste actions
- `src/create-gist.tsx`: gist creation command
- `src/refresh-gists.tsx`: manual refresh command
- `src/lib/github.ts`: GitHub API client and gist normalization
- `src/lib/sync.ts`: sync pipeline and index rebuilding
- `src/lib/search.ts`: MiniSearch indexing and ranking
- `src/lib/storage.ts`: local cache persistence
- `tests/search.test.ts`: search behavior tests

## Development

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build the extension:

```bash
npm run build
```

## Notes

- The extension icon is provided from `assets/icon.png` and referenced in the manifest as `icon.png`
- Search preview is intentionally content-focused, with filename and description shown in the metadata panel instead of repeated in the main preview body
- Screenshots for the store listing live in the top-level `media/` folder
