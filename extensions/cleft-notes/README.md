# Cleft Notes

Search Cleft notes and raw transcripts in Raycast, and start, stop, or continue voice notes with Cleft's native Apple Shortcuts actions.

## What's new

- Preview pane with the note summary and a **snippet of where your search matched**.
- Notes grouped by Today / Yesterday / This Week / This Month / Older.
- Paste Summary action.

## Setup

1. Install and sign in to [Cleft for Mac](https://cleftnotes.com/).
2. Open **Configure Cleft Integration** in Raycast. Install its three native Shortcuts templates. Keep the suggested names, or enter your own shortcut names in extension settings.
3. In **Cleft Settings → Local Sync**, enable **Save notes as files**. Use **Show path**, then choose that exact folder in this extension's **Local Sync Folder** setting. To include older notes, use **Save existing notes as files** in Cleft.
4. Allow Cleft microphone access and Raycast file access when macOS asks.

Each capture shortcut contains one Cleft App Intent and no keyboard simulation. Cleft handles recording, transcription, note processing, and sync. A shortcut completion confirms that macOS ran the shortcut; Cleft remains the source for recording and processing status.

## Commands

| Command                     | Behavior                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Search Notes                | Search titles, summaries, tags, and raw transcripts; filter by tag; preview and copy text; reveal or open the Markdown export; play optional exported audio. |
| Read Latest Transcript      | Read and copy the transcript from the newest **exported** Cleft note by its creation date.                                                                   |
| Start Voice Note            | Run Cleft's native Start Recording action. Recording starts immediately.                                                                                     |
| Stop and Save Recording     | Run Cleft's native Stop Recording action.                                                                                                                    |
| Continue Last Note          | Run Cleft's native Continue Last Note action. This appends to Cleft's latest note.                                                                           |
| Configure Cleft Integration | Install capture shortcuts and configure search.                                                                                                              |

Search reads only documented Cleft Markdown exports with `source: cleft` and a numeric `cleft_id`. It ignores other Markdown files, hidden files, and symlinks. Refresh Notes reads updated exports. Search supports 5,000 Markdown files, six nested folder levels, 2 MiB per file, and 32 MiB total per refresh; the list shows the first 200 matches and indicates skipped or limited files.

Cleft Local Sync is one-way export. This extension does not edit or delete exported copies, and changes made to those copies do not sync back into Cleft. Notes and transcripts stay on the Mac; the search command sends no content to a server.

## Integration sources

- [Cleft Apple Shortcuts guide](https://learn.cleftnotes.com/user-guides/integrations/apple-shortcuts/overview)
- [Cleft Local Sync and export format](https://learn.cleftnotes.com/user-guides/integrations/local-sync/overview)
- [Cleft macOS guide](https://learn.cleftnotes.com/user-guides/macos)
- [Apple Shortcuts command-line guide](https://support.apple.com/guide/shortcuts-mac/run-shortcuts-from-the-command-line-apd455c82f02/mac)

## Development

```sh
npm ci
npm run build
npm run lint
npm run typecheck
npm test
npm run dev
```

This is an unofficial integration. Cleft's name and application icon belong to Cleft.
