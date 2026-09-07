# Granola

Create, manage, and review notes in [Granola](https://www.granola.ai/). Use the `@granola` AI extension to ask questions about your notes, or trigger other AI tasks, for example:
> create a list of tasks for me in @todoist based on my last meeting in @granola

## Getting started
Open **Search Notes** (or any browsing/export command), press **Sign In to Granola**, and approve the matching code in your browser. Your notes load automatically after approval. Sign in once; Raycast securely stores a separate session and refreshes it automatically on macOS and Windows.

The extension uses OAuth authentication. No API key, system password, or access to Granola's local files is required.

The Granola desktop app is only required for **Create Note** and **Open in Granola**. Sign in from a view command before using AI tools. To disconnect or switch accounts, use **Sign Out** in Raycast Settings → Extensions → Granola, then reopen a command. Local sign-out removes Raycast's saved credentials; it does not revoke the session on Granola's servers.

If you decline approval, return to Raycast and press **Try Again**. Expired codes have a **Get New Code** action. The centered sign-in screen keeps your confirmation code visible while browser approval is pending. You can cancel with **⌘.** or by leaving the command. Error screens include **Copy Diagnostics** for troubleshooting. Network failures do not require signing out of the Granola desktop app.

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

## Developer Notes / Privacy

Release tooling currently uses `@raycast/api` 1.x because the 2.2.0 CLI failed to extract schemas for existing AI tools during validation. `npm run publish` uses the installed CLI. The lockfile includes patched esbuild and minimatch overrides; revisit these when upgrading the CLI. Run `npm ci`, `npm test`, `npm run lint`, and `npm run build` before submission.

*How does this extension work?*
The extension uses OAuth authentication, with credentials stored through Raycast's OAuth token storage. Access tokens are refreshed automatically, including when the server rejects a token before its recorded expiry. Read requests can retry once after recovery; writes and generation requests require an explicit retry. The desktop app's files and tokens are never read or modified.

Note and folder operations use Granola's private API, which may change. Access remains governed by Granola's server permissions.

*What data does this extension collect?*
This extension does not collect telemetry. Authentication requests go to Granola's authentication service and note requests go directly to Granola's API. Tokens are not printed in diagnostics.

## Support

### Troubleshooting

After reproducing a problem, use **Copy Diagnostics** on the sign-in or load-error screen and attach the report to your issue. Reports contain the command, platform/Raycast version, endpoint, HTTP status, time to response headers, request reference IDs, and auth lifecycle events. They exclude tokens, device codes, account information, request/response bodies, and meeting content. Local logs are bounded to approximately 128 KiB per command; reports include up to 200 recent records. Nothing is uploaded automatically.

Common signals: `401` means authorization was rejected, `403` means the operation is not permitted, `404` identifies a missing route/resource, and `429` means rate limiting. `auth.refresh_saved` confirms the replacement token was stored. `auth.refresh_uncertain` or `auth.refresh_lock_timeout` means reconnect using Raycast's extension sign-out preference; the extension deliberately avoids replaying a potentially consumed refresh token.

### Developer tests

Run `npm test`, `npm run lint`, and `npm run build`. Offline tests cover token expiry/rotation, concurrent refresh, revocation, cancellation, transport errors, endpoint coverage, and diagnostic privacy. The endpoint catalog distinguishes reads, writes, generation, and authentication; skipped live checks are never reported as passes.

See [live validation](tests/LIVE_VALIDATION.md) for the opt-in dummy-note/Notion integration test and the recorded results. These tests require explicit authorization to create/export/delete test data and are not run by `npm test`.

This plugin is an independent project and is not affiliated with, endorsed by, or in any way officially connected to Granola Inc. All trademarks and copyrights related to Granola and Granola AI are the property of their respective owners.
