# QQ Mail

View and manage your QQ Mail inbox directly in Raycast.

## Features

- **Email List View** - Browse emails with subject, sender, date, and read/unread status
- **Email Detail View** - Read full email content in a detail pane
- **Folder Navigation** - Switch between Inbox, Sent, Drafts, Archive, Trash, and custom folders
- **Filtering** - Filter emails by All, Unread, Read, or Has Attachment
- **Compose Email** - Write new emails or Reply, Reply All, and Forward
- **Pagination** - Load more emails as needed with configurable page size
- **Attachments** - Download individual attachments or all at once
- **Expanded Email View** - Read emails in full-screen with metadata sidebar
- **Email Actions**:
  - Reply / Reply All / Forward
  - Mark as Read / Unread
  - Archive
  - Delete
  - Download Attachments
  - Copy subject, sender, or email body (plain text or Markdown)

## Requirements

- A QQ Mail account (`@qq.com`)
- IMAP/SMTP service enabled in QQ Mail settings
- An **authorization code** (not your QQ password)

> **Note:** This extension currently supports one account at a time.

## Setup

1. Log in to [QQ Mail](https://mail.qq.com) in your browser
2. Go to **Settings → Account → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV**
3. Enable **IMAP/SMTP Service** and generate an **authorization code**
4. Open the extension preferences in Raycast and fill in:
   - **QQ Email Address**: e.g. `123456@qq.com`
   - **Authorization Code**: the code generated in step 3 (NOT your QQ password)
   - **Emails to Load**: number of emails per page (20, 50, 100, or 200)

The extension connects to QQ Mail servers automatically:

- IMAP: `imap.qq.com:993` (SSL)
- SMTP: `smtp.qq.com:465` (SSL)

## Filtering

The extension provides a single dropdown that combines:

- **Folder selection** (Inbox, Sent, Drafts, etc.)
- **Status filters** (All, Unread, Read, Has Attachment)

Select a folder first, then use the filter section to narrow down emails.

## Pagination

The extension loads emails in pages based on your "Emails to Load" preference. Press ⌘L or select "Load More Emails" from the action menu to fetch older emails.

## Attachments

When viewing an email with attachments:

1. Select "Download Attachments" from the action menu
2. Choose to download a single attachment or all at once
3. Single files are saved to `~/Downloads/`
4. Multiple files are saved to a timestamped folder: `~/Downloads/qq-mail-attachments-YYYYMMDDTHHMMSS/`

## Keyboard Shortcuts

| Action               | Shortcut |
| -------------------- | -------- |
| Expand Email         | ⌘↩       |
| Reply                | ⌘R       |
| Reply All            | ⇧⌘R      |
| Forward              | ⌘F       |
| Mark Read/Unread     | ⇧⌘U      |
| Star/Unstar          | ⇧⌘S      |
| Archive              | ⌘E       |
| Delete               | ⌘⌫       |
| Download Attachments | ⌘D       |
| Compose New Email    | ⌘N       |
| Copy Subject         | ⇧⌘J      |
| Copy Sender          | ⇧⌘C      |
| Copy as Markdown     | ⇧⌘M      |
| Load More Emails     | ⌘L       |
