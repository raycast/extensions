# Spark Mail Changelog

## [Windows Support] - 2026-09-12

- Added Windows support: finds `spark.exe` in the Spark Desktop install folder or on `PATH`, handles CRLF output, and cleans URL-encoded line breaks out of Spark deep links
- "Show Attachments in Finder" now uses the built-in action, so it reads "Show in Explorer" on Windows
- Recognizes the "can't access your Spark Desktop application" error and shows the "Spark Desktop isn't running" hint
- Added `npm test` (Node's built-in test runner) covering CLI discovery per platform, CRLF parsing, and deep-link cleanup

## [Initial Version] - 2026-09-11

Based on the extension by Vir Khanna ([@v-khanna](https://github.com/v-khanna)) from [raycast/extensions#28483](https://github.com/raycast/extensions/pull/28483), reused under the MIT license.

- Inbox browsing with smart views (Unread, Has Attachment, New Senders, Priority, People, Notifications, Newsletters, Invites) and load-more pagination
- Hybrid keyword + semantic mail search
- Thread reader with full message bodies, Spark deep link, and attachment download/open
- Calendar agenda (today / tomorrow / this week)
- Contact lookup with "find emails from" drill-down
- Folder & label browser with per-folder email lists
- Compose drafts (requires Spark Triage access)
- Write actions (archive, pin, mark as read) gated to accounts with Triage access or higher (Triage / Send)
