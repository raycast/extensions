# Twelfth for Raycast

Your Twelfth workspace from Raycast.

| Command | What it does |
|---|---|
| **What Should I Do Today** | Your open actions, grouped Overdue → Due Today → This Week → Later, in the workspace's timezone. Filter to yours (plus unassigned) or everyone's. `⌘D` shows the detail, `⌘⇧K` asks Twelfth about the action. |
| **Twelfth Today** (menu bar) | The count of overdue and due-today actions, refreshed every 15 minutes. Red when something is overdue. |
| **Search Products** | Your range with stock on hand, cover, velocity, sales, GP% and open findings. Sort by most findings, lowest cover, fastest selling and more. |
| **Projects** | Projects in flight with stage, open and overdue tasks. |
| **Ask Twelfth** | Opens a Twelfth chat with your question filled in. Also works as a fallback command. |

In Raycast AI, `@twelfth what should I do today?` uses the same data through three AI tools (open actions, products, projects).

## Signing in

The first command you run opens Twelfth in your browser. Sign in, pick the workspace and the tools to allow, and you're connected. You only see what you can see in the app: your remits, your projects. End the connection any time in Twelfth under **Settings → AI & agents**.

A workspace owner or admin can paste a **workspace API key** (`twelfth_mcp_…`, from the same settings page) into the extension's preferences instead. A key reads the whole workspace rather than one person's remits, and "mine" filtering is unavailable with it.

Everything is read-only. The extension can't change anything in Twelfth.
