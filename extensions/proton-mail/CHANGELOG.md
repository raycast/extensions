# Proton Mail Changelog

## [Mailboxes, Faster List and Bridge Status] - {PR_MERGE_DATE}

- New Mailboxes screen listing system mailboxes, folders and labels with their email and unread counts. Browse Email still opens on the inbox (Esc or ⌘[ goes back), or directly on the mailboxes with the new "Open On" preference. Folders list their subfolders above their emails, and the dropdown only holds filters
- The list uses the full width, with Today, Yesterday and month sections. ⌘D shows the email preview, or the new "Email Preview" preference shows it by default. "Download Attachments" moves from ⌘D to ⌘⇧A
- Emails are sorted by the date Proton received them instead of the order they reached the folder, and older ones load when scrolling to the bottom ("Load More Emails" and ⌘L still work)
- Search looks through the whole folder by subject or sender, on the server, instead of the loaded page
- Marking an email as read, archiving or deleting it updates the list right away without reloading it. In the expanded view, archiving or deleting goes back to the list
- When Proton Mail Bridge isn't running or rejects the credentials, a screen says what to do instead of showing an empty folder. It checks Bridge every few seconds and loads the emails once Bridge is ready
- Connections to Bridge stay open for the whole command instead of one per action, folder counts load on their own connection, and the list no longer downloads part of every email for an unused preview, so lists and actions are faster
- Quicklinks from "Save Current View as Quicklink" open their folder and filter
- Fix the "Has Attachment" filter showing partial or empty pages, and every email showing as unread while the list loads from cache
- "Emails to Load" moves to Browse Email's preferences, and "Compose Format" is renamed "Writing Format", since it also applies to replies and forwards

## [Readable Emails] - 2026-10-10

- Emails are converted to clean Markdown: links show their text instead of tracking URLs, and hidden preheaders, tracking pixels, layout tables and repeated product links are dropped. Short links that follow each other share a line, and newsletter headings are shown smaller
- Plain text emails keep their line breaks and get short link labels
- The expanded view shows the subject, sender, recipients and date above the email instead of in a narrow sidebar that cut them off
- New "Remote Images" preference of Browse Email (off by default), so opening an email no longer loads tracking images
- New "Open Original in Browser" action (⌘⇧O) to see the full HTML email
- Opening an email only downloads its text, not its attachments, and recently opened emails stay in memory, so moving through the list and expanding an email are faster
- Fix out-of-memory crashes on emails with inline images
- Email bodies are no longer written to Raycast's cache on disk

## [Fix Delete and Open in Proton Mail] - 2026-10-05

- "Delete" now moves emails to Trash ("Move to Trash"). In Trash and Drafts it becomes "Delete Permanently", with a confirmation
- "Open in Proton Mail" opens the email itself instead of a subject search

## [Updated Icon] - 2026-10-05

- Update the extension icon to the current official Proton Mail logo

## [Initial Version] - 2026-01-23
