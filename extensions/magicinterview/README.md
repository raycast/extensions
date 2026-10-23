# MagicInterview for Raycast

Search saved conversations and create preparation conversations for interviews, meetings, sales calls, and practice. Open a saved conversation in MagicInterview for live suggestions about what to say next.

## Start with a free account

New to MagicInterview? [Try the free preparation preview](https://magicinterview.ai/interview-tomorrow) before creating an account. Your account and saved workspace are free, with no card required. Pro unlocks cloud coaching and AI tools in MagicInterview.

```text
Create a free account → Save interview or meeting context
        → Connect Raycast → Search or create a conversation
        → Open it in MagicInterview → Choose Pro when you want coaching
```

## Connect your account

This Raycast extension currently requires a manual connection token. Other compatible MCP clients can use browser sign-in, but that does not replace this extension's token preference.

1. [Create a free account](https://magicinterview.ai/app?auth=sign-up) or [sign in](https://magicinterview.ai/app?auth=sign-in).
2. Open **Settings → AI client access**, expand **Manual setup**, and choose **Create connection and copy configuration**. You can also open [AI client access settings](https://magicinterview.ai/app/settings/mcp).
3. Copy the bearer token from the newly generated configuration and paste it into this extension's **MagicInterview Connection Token** password preference.

The extension connects directly to `https://magicinterview.ai/mcp` using your token. Your token is used only to access your MagicInterview account and is never included in conversation links. Revoke it in MagicInterview's AI client access settings when you no longer need the connection.

## Your first conversation

If search is empty, use **Create Conversation** to save an interview or meeting with a title and your preparation notes. It opens in MagicInterview, where you can add your CV, job description or brief. Later, **Search Conversations** brings you back to that same context.

## Commands

- **Search Conversations:** Search by title, company, or role. Results load in pages of 25; scroll to load more. Open a conversation or copy its link.
- **Create Conversation:** Enter a title, purpose, optional company, role, preparation notes, and language. Saves to General without switching the currently active conversation, then opens the saved conversation. Default account sources are inherited.

This extension does not capture audio or provide live coaching inside Raycast. Those features run in MagicInterview. A MagicInterview account and connection token are required; paid features remain subject to your MagicInterview plan.

## Development

Run `npm install`, `npm run build`, and `npm run lint`. Use `npm run dev` to load the extension in Raycast. No shared credentials are included.
