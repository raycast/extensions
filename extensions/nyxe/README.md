# Nyxe Mail for Raycast

Search, triage and send your Nyxe mail without leaving the keyboard. Grab sign-in codes the moment they land, and keep an eye on your inbox from the menu bar.

## Setup

1. In Nyxe, open **Settings → API tokens** and create a token. Keep every permission on unless you want a read-only setup.
2. Copy the token (it starts with `nyxe_pat_`). You only see it once.
3. Run any Nyxe Mail command in Raycast and paste the token when asked.

## Commands

| Command | What it does |
|---|---|
| Copy Sign-In Code | Copies the newest verification code from the last 15 minutes. The clipboard entry is concealed and the HUD never shows the code. It says "unverified sender" when Nyxe's mail server couldn't vouch for who sent it. |
| Open Sign-In Link | Opens the newest magic or verification link from the last 15 minutes, only from a verified sender and only on that sender's own site. |
| Search Mail | Full-text search with a plain-text preview. |
| Inbox | Your inbox, filtered to All or Unread. The unread count shows as the command's subtitle. |
| Send Email | Compose with To/Cc/Bcc, From, and attachments. Prefills from your selection or clipboard, and from the Finder selection. |
| Email Selection to Myself | Sends the selected text (or clipboard) to your own inbox. |
| Copy My Address | Your address, aliases and team addresses. |
| Find Contact | Look up people you've had mail from. |
| Menu Bar Inbox | Unread count and newest mail, refreshed every minute. |

Thread actions in Search Mail and Inbox: open in Nyxe, reply in Nyxe (opens the thread to reply there), archive, mark read or unread, snooze, tag, and copy the sender's address.

## AI

With Raycast AI you can ask `@nyxe` to search, read and summarize threads, draft replies (saved as drafts in Nyxe, never sent), send new mail and archive threads. Sending and archiving ask you to confirm first. Sign-in and verification emails are withheld from AI (subject and body), so codes never reach it.

## Preferences

- **API Token**: required.
- **Open Messages In**: Automatic (the Nyxe app if installed, else the browser), Nyxe App, or Browser.
- **API Base URL**: leave the default unless you were asked to point at another Nyxe deployment.

## Development

```sh
npm install
npm run dev     # load the extension in Raycast
npm test        # unit tests for the pure modules
npm run lint
npm run build
NYXE_API_TOKEN=… NYXE_API_BASE_URL=https://convex-site-dev.nyxe.app npm run smoke
```

The extension talks only to Nyxe's versioned HTTP API (`/api/v1`). The contract lives in the Nyxe repo at `convex/features/api/README.md`.
