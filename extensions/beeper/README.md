# Beeper Raycast Extension

Manage Beeper Desktop with Raycast. Uses the [Beeper Desktop API TypeScript SDK](https://developers.beeper.com/desktop-api-reference/typescript/) with PKCE authentication.

## Commands

- **Recent Chats**: Browse recent chats, open in Beeper Desktop, reply/edit, set reminders, archive, and upload/download attachments.
- **Unread Chats**: Focus on chats with unread messages.
- **Contacts**: Search contacts across connected accounts and start chats.
- **Search Recent Messages**: Search messages across chats with sender/attachment/date filters.
- **Connected Accounts**: View all connected messaging services.
- **Open Beeper**: Bring Beeper to the foreground.

## AI Tools

This extension includes AI tools for natural language actions:

- **Open Chat**: Open chats by fuzzy-matched contact/group name, optionally by service.
- **Send Message**: Send messages with confirmation and contact suggestions.
- **List Accounts**: List all connected messaging services.
- **Search Messages**: Search message content across all chats.
- **Summarize Unread**: Summarize unread activity per chat or across all chats.
- **Summarize Messages**: Summarize recent chat activity with time-range support.

## Preferences

- **Beeper Desktop API Base URL**: Defaults to `http://localhost:23373`.
- **Use Mock Data**: Optional demo mode for screenshots and testing.

## Prerequisites

Before using this extension, you **must enable the Beeper Desktop API** in your Beeper Desktop settings:

1. Open Beeper Desktop
2. Go to **Settings** (⚙️ icon in the sidebar)
3. Navigate to **Developers** section
4. Find the **Beeper Desktop API** section
5. Click the toggle to enable "Start on launch"
6. The API should now be running on port 23373 (you'll see "Running with MCP on port 23373")

Once enabled, you can use the Raycast extension to interact with your Beeper chats and accounts.

## Setup

See the [Beeper Desktop API Getting Started guide](https://developers.beeper.com/desktop-api/#get-started) for additional setup instructions.
