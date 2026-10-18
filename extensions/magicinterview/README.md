# MagicInterview for Raycast

Search saved conversations and create preparation conversations for interviews, meetings, sales calls, and practice. Open a saved conversation in MagicInterview for live suggestions about what to say next.

## Connect your account

1. Sign in at [MagicInterview](https://magicinterview.ai/app).
2. Open **Settings → AI client access** and create a connection token. You can also open [AI client access settings](https://magicinterview.ai/app/settings/mcp).
3. Paste the token into this extension's **MagicInterview Connection Token** password preference.

The extension connects directly to `https://magicinterview.ai/mcp` using your token. Your token is used only to access your MagicInterview account and is never included in conversation links. Revoke it in MagicInterview's AI client access settings when you no longer need the connection.

## Commands

- **Search Conversations:** Search by title, company, or role. Results load in pages of 25; scroll to load more. Open a conversation or copy its link.
- **Create Conversation:** Enter a title, purpose, optional company, role, preparation notes, and language. Saves to General without switching the currently active conversation, then opens the saved conversation. Default account sources are inherited.

This extension does not capture audio or provide live coaching inside Raycast. Those features run in MagicInterview. A MagicInterview account and connection token are required; paid features remain subject to your MagicInterview plan.

## Development

Run `npm install`, `npm run build`, and `npm run lint`. Use `npm run dev` to load the extension in Raycast. No shared credentials are included.
