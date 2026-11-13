# Hackban for Raycast

[Hackban](https://hackban.hackclub.com) is Hack Club's self-hosted Trello. This extension brings your boards and
cards into Raycast, from as many Hackban servers as you're signed in to.

## Commands

| Command             | What it does                                                                           |
| ------------------- | -------------------------------------------------------------------------------------- |
| **My Cards**        | Cards you're a member of, grouped into overdue, today, this week, later, no date, done |
| **Search Hackban**  | Board names, card titles and descriptions                                              |
| **Browse Boards**   | Your workspaces and boards; open one to see its lists and cards                        |
| **Create Card**     | Add a card to any list, with a description, due date and position                      |
| **Notifications**   | Cards you were added to and comments on cards you watch                                |
| **Manage Accounts** | Sign in to more servers; rename, recolor, reorder, hide or sign out of them            |

On any card you can open it in the browser, see its description, checklists and comments, mark it complete (`⌘D`),
comment (`⌘⇧N`), move it to another list (`⌘⇧M`), tick checklist items, join or leave it (`⌘J`), and archive it.

## Accounts

The first command you run signs you in to [hackban.hackclub.com](https://hackban.hackclub.com): it opens Hackban in your
browser and asks you to allow **Raycast**. To add a self-hosted server, use **Manage Accounts** (or `⌘⇧A` from any
command) → **Add Account**.

As in [Hackban for Mac](https://github.com/leowilkin/hackban-desktop), there's one account per server, and every
command shows all of them at once, each item tagged with its account's label and color once there's more than one.
Signing in to a server you already have signs that account in again. Hide an account to leave it out of the other
commands without signing out. If an account's sign-in runs out or is revoked, the other commands show a **Sign in to …
again** item for it and keep showing the rest.

The extension signs in with the same OAuth server that MCP clients use, so it can do what the
[MCP tools](https://github.com/hackclub/hackban#mcp-claude-cursor-) can: read and edit boards, lists, cards,
checklists and comments, but never permanently delete anything. Signing out in Raycast forgets the account; to cut off
its access on the server too, revoke Raycast under **Settings → Connected apps** on Hackban.

## Development

```sh
npm install
npm run dev     # loads the extension into Raycast
npm run lint
npm run build
```

All requests go to Hackban's MCP endpoint (`/api/mcp`) as plain JSON-RPC `tools/call` requests (`src/lib/hackban.ts`,
which also merges results across accounts). Sign-in, dynamic client registration and token refresh live in
`src/lib/auth.ts`; the account list and each account's tokens are in Raycast's encrypted local storage
(`src/lib/accounts.ts`).
