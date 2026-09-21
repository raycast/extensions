# Apple Notes Paste

Search Apple Notes, preview their contents, and paste a note into the previously active application. Your notes remain in Apple Notes, including iCloud-synced folders.

## Commands

- **Paste Apple Note** — Search and preview notes. Press Return to paste or open the selected note, according to your preference.
- **Create Apple Note** — Create a note directly in the configured default folder. The title is saved with Apple Notes' title formatting.

## Preferences

- **Default Folder** — Start searches in all notes or in a chosen Apple Notes folder.
- **Return Key Action** — Choose whether Return pastes note content or opens the note in Apple Notes.
- **Exclude First Line When Pasting** — Treat the first line as a title and omit it from pasted content. The detail view makes this explicit.

## Privacy

Apple Notes Paste reads the local Apple Notes database only to populate its search list. When you select a note, its plain-text content is read locally and pasted into the application that was active before Raycast opened. The extension has no network requests, analytics, account, or external service.

## Setup

On first use, grant Raycast Full Disk Access when macOS asks. This permission is necessary to search Apple Notes. Choose **All Notes** or a specific folder from the dropdown in the command, or configure a default folder in the extension preferences.

Notes stored in an iCloud account are synchronized by Apple across devices signed into that same Apple Account. This extension does not manage that synchronization.
