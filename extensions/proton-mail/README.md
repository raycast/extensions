# Proton Mail

View and manage your Proton Mail inbox directly in Raycast via Proton Mail Bridge.

## Features

- **Email List View** - Browse emails with subject, sender, date, and read/unread status
- **Email Detail View** - Read full email content in a detail pane
- **Mailboxes** - Browse Inbox, Sent, Drafts, Archive, Trash, your folders (with their subfolders) and labels, with email and unread counts
- **Filtering** - Filter emails by All, Unread, Read, or Has Attachment
- **Compose Email** - Write new emails or Reply, Reply All, and Forward
- **Pagination** - Older emails load as you scroll, with a configurable page size
- **Bridge Status** - Says when Proton Mail Bridge isn't running or rejects the credentials, and loads your emails as soon as it's ready
- **Attachments** - Download individual attachments or all at once
- **Quicklinks** - Save current folder/filter view as a Raycast quicklink
- **Open in Proton Mail** - Open the email in the Proton Mail web app
- **Expanded Email View** - Read emails in full screen, with the subject, sender, recipients and date above the email
- **Open Original in Browser** - See the email's full HTML in your browser when the layout matters
- **Remote Images** - Off by default so senders can't track when you open an email; turn on Browse Email's "Remote Images" preference to show them
- **Demo Mode** - Anonymize email data for screenshots and demos
- **Email Actions**:
  - Reply / Reply All / Forward (with compose form)
  - Mark as Read / Unread
  - Archive
  - Delete
  - Download Attachments
  - Copy subject, sender, or email body (plain text or markdown)
  - Save as Quicklink

## Requirements

1. **Proton Mail Bridge** must be installed and running on your Mac
2. A Proton Mail account (paid subscription required for Bridge)

> **Note:** This extension currently supports one account/address at a time.

## Setup

1. Install and configure [Proton Mail Bridge](https://proton.me/mail/bridge)
2. Sign in to your Proton account in Bridge
3. Open the extension preferences in Raycast and enter your Bridge settings:
   - **IMAP Hostname**: Usually `127.0.0.1`
   - **IMAP Port**: Usually `1143`
   - **SMTP Hostname**: Usually `127.0.0.1`
   - **SMTP Port**: Usually `1025`
   - **Username**: Your Proton Mail email address
   - **Password**: The Bridge-generated password (found in Bridge app, NOT your Proton account password)
4. Optionally, set **Emails to Load** (25, 50, 100, or 200 per page) in the Browse Email command's preferences

## How to Find Your Bridge Settings

1. Open Proton Mail Bridge
2. Click on your account
3. Look for "Mailbox details" section
4. Copy the IMAP and SMTP settings shown

![Proton Mail Bridge Settings](assets/mail-bridge.png)

## Filtering

The command opens on your inbox. Press Esc (or ⌘[ "Back") to go back to the Mailboxes screen, which lists your mailboxes, folders and labels with their email and unread counts. Opening a folder shows its subfolders above its emails. To start on the Mailboxes screen instead, set Browse Email's "Open On" preference to Mailboxes.

The list uses the full width. Press ⌘D to show the selected email next to it, or turn on Browse Email's "Email Preview" preference to show it by default.

The dropdown next to the search bar filters the current folder: All, Unread, Read or Has Attachment.

## Pagination

The extension loads emails in pages based on Browse Email's "Emails to Load" preference. Scroll to the bottom of the list to load older emails automatically, or press ⌘L ("Load More Emails" in the action menu).

## Attachments

When viewing an email with attachments:

1. Select "Download Attachments" from the action menu
2. Choose to download a single attachment or all attachments
3. Single files are saved to `~/Downloads/`
4. Multiple files are saved to a timestamped folder: `~/Downloads/proton-attachments-YYYYMMDDTHHMMSS/`

## Quicklinks

Save your frequently used views as Raycast quicklinks:

1. Navigate to a folder and apply a filter
2. Press ⌘⇧S or select "Save Current View as Quicklink"
3. The quicklink will open directly to that folder/filter combination

## Demo Mode

For taking screenshots or showing the extension to others, enable Demo Mode (⇧⌘D) to anonymize all email data:

- Names are replaced with sample names (Alice Johnson, Bob Smith, etc.)
- Email addresses become example.com addresses
- Subjects are replaced with generic titles
- Email body content is replaced with placeholder text

Toggle it off with the same shortcut when done.

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Reply | ⌘R |
| Reply All | ⇧⌘R |
| Forward | ⌘F |
| Mark Read/Unread | ⇧⌘U |
| Archive | ⌘E |
| Move to Trash (Delete Permanently in Trash and Drafts) | ⌘⌫ |
| Copy Subject | ⌘C |
| Copy Sender | ⇧⌘C |
| Save as Quicklink | ⇧⌘S |
| Download Attachments | ⇧⌘A |
| Show/Hide Preview | ⌘D |
| Load More Emails | ⌘L |
| Expand Email | ⌘↩ |
| Toggle Demo Mode | ⇧⌘D |
| Copy as Markdown | ⇧⌘M |
| Compose New Email | ⌘N |
| Open Original in Browser | ⇧⌘O |
| Back (to the parent folder or Mailboxes) | ⌘[ |
