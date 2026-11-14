# Granola

Create, manage, and review notes in [Granola](https://www.granola.ai/). Use the `@granola` AI extension to ask questions about your notes, or trigger other AI tasks, for example:
> create a list of tasks for me in @todoist based on my last meeting in @granola

## Getting started

Open **Search Notes**, select **Sign In to Granola**, and approve the code in your browser. The extension uses OAuth authentication; Raycast securely stores and refreshes your session.

Sign in before using AI tools. The Granola desktop app is only required for **Create Note** and **Open in Granola**. To switch accounts, sign out in Raycast Settings → Extensions → Granola, then reopen a command.

## Granola Commands
- **Create Note** - Start a new note and recording immediately in Granola
- **Search Notes** - View your notes in a list, see their details (including transcript), copy their links, or copy their contents as HTML or Markdown
- **Search People** - Browse and search people from your Granola meetings, view their company affiliations and meeting history
- **Search Companies** - Explore companies from your meetings, see associated people and meeting details
- **Export Transcripts** - Select multiple notes and export their transcripts in bulk with folder-aware filtering
- **Export Notes** - Select multiple notes and export them in bulk with folder-aware filtering
- **Create Note from Transcript** - Create a new note from text transcripts or YouTube videos with AI-powered summaries

## AI Tools
- **List Meetings** - Get meeting metadata (title, date, folders) with optional source filtering (`my-notes`, `shared`, or `all`)
- **Get Note Content** - Retrieve note content (original, enhanced, or auto-selected)
- **Get Transcript** - Retrieve the full transcript for any specific note
- **List Folders** - Get folder metadata, note counts, and sharing info (`isShared`, `userRole`, `memberCount`)
- **Manage Folders** - Create, delete, and organize Granola folders and folder contents
- **Recipes** - Search and use Granola recipes within Raycast AI
- **Save to Notion** - Export one or more notes to Notion with batch processing

## Features
- **Shared Documents** - View and query notes shared with you from teammates and collaborators (both in UI and via AI)
- **Open in Granola** - Open any note directly in the Granola app with ⌘O
- **YouTube Integration** - Extract transcripts directly from YouTube URLs
- **Folder Organization** - Browse and filter notes by folders with visual icons and note counts
- **Batch Operations** - Process multiple notes simultaneously with streaming exports
- **Cross-platform Support** - Works on both macOS and Windows
- **Notion Export** - Save notes and transcripts to Notion with one click
- **ZIP Exports** - Export multiple notes as organized ZIP files grouped by folder

## Privacy

Requests go directly to Granola. The extension does not collect telemetry or read the desktop app's local files. It uses Granola's private API, which may change.

## Support

Use **Copy Diagnostics** on an error screen when reporting a problem. Reports include request status and reference IDs, but exclude credentials and meeting content. Nothing is uploaded automatically.

## Development

Run `npm test`, `npm run lint`, and `npm run build` before submitting changes.

This plugin is an independent project and is not affiliated with, endorsed by, or in any way officially connected to Granola Inc. All trademarks and copyrights related to Granola and Granola AI are the property of their respective owners.
