# Any.do

Manage your [Any.do](https://www.any.do) tasks from Raycast: a single page for searching, adding,
managing and being reminded about your tasks — with Persian/Jalali date support, instant AI-assisted
quick add, due alerts and reports.

## Features

- **One page for everything** — search, quick add, list/tag/priority filters, sorting, a two-pane detail
  view and one-key shortcuts. No separate screens to juggle.
- **Smart quick add** — type free-form text and it becomes a full task:

  ```
  خرید خانه شیر 1 بسته خرما 2 بسته پنیر 3 تا بصورت فوری واسه 5 دقیقه آینده
  → title:  خرید منزل        note:  - 🥛 ۱ بسته شیر / - 🌴 ۲ بسته خرما / - 🧀 ۳ تا پنیر
    tags:   #خرید            priority: 3 (فوری)
    list:   خرید منزل        due: in 5 minutes
  ```
- **Dates in Persian and English** — `1405/08/15`, `۲۵ آبان`, `فردا`, `پس‌فردا`, `دوشنبه`, `۹ شب`, `۳ روز دیگر`,
  `۵ دقیقه دیگر`, `۵/۱۱/۲۰۲۶` all resolve to a real due date. Everything can be shown in Jalali, Gregorian or both.
- **Reminders & repeating reminders** — set them in one keystroke (Ctrl+M for "in 5 minutes"), or repeat daily/weekly/monthly.
- **Subtasks** in the side panel, checkable straight from the action menu.
- **Due alerts** — a background command checks every minute and raises a desktop notification before and at the due time.
- **Tags and priority** — the Any.do API has no fields for them, so they are stored in the task note as
  `#tag` and `!` / `!!` / `!!!`. They stay visible in Any.do itself.
- **Reports** — a monthly archive (Markdown + a styled RTL HTML report) grouped by list, plus optional
  daily/weekly digests to your own Telegram bot, a local Markdown log and Notion.
- **Raycast AI** — the extension ships AI tools so Raycast AI can search, create, complete and reschedule
  your tasks, and it refines the quick-add result when AI is available.

## Commands

| Command | What it does |
| --- | --- |
| **Tasks** | The main page: search, smart quick add, manage tasks, lists, subtasks, calendar, stats and reports. Accepts an argument (`Today`, `Week`, `Completed`, `No date`, `All`) to open on a view. |
| **Due Alerts** | Background command (every minute) that sends the due/lead notifications and the optional digests. |

## Setup

1. Run the **Tasks** command and pick **Sign in with Any.do**. The extension registers itself with Any.do's
   official MCP server over OAuth 2.0 (dynamic client registration + PKCE) and opens your browser; approve
   the request and you are back in Raycast.
2. Optional: open the extension preferences to pick your default list, default time of day, alert lead time
   and sound, the UI language (English or Persian) and the reports/Telegram/Notion options.

### Optional integrations

| Setting | Notes |
| --- | --- |
| Telegram digest / instant alerts | Create a bot with @BotFather and paste its token plus your chat id. Nothing is sent anywhere unless you fill these in. |
| File log & monthly archive | Choose a folder; the extension writes `anydo-completed.md`, `anydo-daily.md` and `anydo-archive-YYYY-MM.md/.html` there. |
| Notion | Optional internal integration token + database id. |
| Report font | The HTML reports use a Persian web font. If you own a font that no CDN ships (e.g. IRANSansX), pick its file and it will be embedded in the report. |

## Privacy

- Tasks are read and written **directly** between your machine and Any.do's official MCP server
  (`https://mcp.any.do/mcp`). There is no intermediate server owned by this extension.
- The OAuth tokens are stored by Raycast in its local `LocalStorage` — they never leave your machine except
  to talk to Any.do.
- Telegram, Notion and the local files are **opt-in** and only used when you configure them.
- No analytics, no telemetry, no third-party tracking.

## Notes and limitations

- Any.do's API has no hard delete: deleting marks a task as done and it can be reopened from the
  **Completed** view.
- The instant desktop alert uses PowerShell toast notifications, so it is **Windows-only**; every other
  feature works on macOS as well.
- Tags and priority live inside the task note because Any.do has no dedicated fields.
- Raycast AI is optional: when it is not available the deterministic analyser does the whole job.

## Development

```bash
npm install
npm run dev            # npx ray develop — loads the extension into Raycast
npm run build          # distribution build
npm run lint           # eslint + prettier + manifest validation
npm run test:parser    # free-form Persian date parsing
npm run test:analyze   # smart quick-add analysis (title/note/tags/priority/list)
npm run test:archive   # monthly report renderer
```

The extension talks to Any.do through its own small MCP client (`src/anydo/client.ts`) with a tiny OAuth
implementation (`src/anydo/oauth.ts`); see those files for the exact JSON-RPC and PKCE details.
