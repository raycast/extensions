# Folnaro for Raycast

Search your invoices, quotes, customers, expenses and projects, run the timer and capture receipts in
[Folnaro](https://folnaro.app), the Mac app for invoices, time tracking and receipts for
freelancers in Germany. Everything stays on your Mac.

## Commands

| Command | What it does |
|---|---|
| **Search Folnaro** | One list for invoices, quotes, customers, expenses and projects, in sections. Status, amount and due date at a glance; ⌘D shows the details. Open a record in Folnaro, copy its number, amount or `folnaro://` link, or look at an invoice PDF in Quick Look (⌘Y). |
| **Start Timer** | Your recent projects first, then all active projects and customers. Type to filter; when nothing matches, the text becomes the note of the new entry. ⌘⇧↵ adds a note and an activity. A running timer can be stopped and replaced in one step. |
| **Stop Timer** | Stops the running timer and saves the time entry. |
| **Running Timer** | The running timer in the menu bar with its elapsed time. Refreshes once a minute with one short helper call; the time itself is computed from the start, so nothing polls in between. Can hide itself while no timer runs. |
| **Create Invoice Draft** | A form for customer, project, subject, service period and line items. Folnaro computes totals and VAT and assigns the number only when you finalize the draft in the app. |
| **Capture Receipt** | Takes the PDF or image selected in Finder (or one you pick), suggests vendor and date from the file name and puts the receipt into Folnaro's receipt inbox. |
| **Open Section** | Jumps to Overview, Invoices, Time, Expenses or any other section of Folnaro's sidebar. |

## Setup

1. Install Folnaro from the Mac App Store and open it once.
2. Install this extension. It finds Folnaro in `/Applications`, `~/Applications` or through Spotlight.
3. Folnaro shares nothing until you allow it. In Folnaro open **Settings > Agents** and turn on **Read**
   under **What agents may do**. For the commands that change data, turn on their switch there too:

| Command | Switch in Folnaro |
|---|---|
| Every command that shows data (search, lists, Running Timer) | Read |
| Start Timer, Stop Timer, Running Timer (stop) | Track time |
| Create Invoice Draft | Create and edit drafts |
| Capture Receipt | Record expenses |

The extension talks to Folnaro like an agent, through MCP, so it uses these agent switches. The
**Launchers can read** switch under **Settings > Integrations** is only for Alfred and other launchers
that use `folnaro-mcp --query`; it does not let Raycast read.

The switches apply immediately, no restart needed. When one is off, the extension says which one to turn
on instead of failing. **Open Section** presses Folnaro's own Go shortcuts (⌘1 to ⌥⌘4), so Raycast needs
Accessibility access (System Settings > Privacy & Security > Accessibility); without it the command still
brings Folnaro to the front. It assumes the default shortcuts; if you changed them in Folnaro, it may open a different section.

Record actions (Open in Folnaro, the copied link, the timer's "Open in Folnaro") use the record links
`folnaro://<kind>/<id>` that Folnaro already handles. A later Folnaro version may add more of its
`folnaro://` URL scheme, for example links to sections; Open Section can then switch to those and no longer
needs Accessibility access. Nothing in the extension depends on that today.

### After the trial

Folnaro has a 30 day trial. When it has ended without a purchase, or a subscription has lapsed, Folnaro
is in read-only mode: searching, Quick Look, copying and stopping a running timer keep working, while
starting timers, creating drafts and capturing receipts show a short note that Folnaro needs to be unlocked
in the app. Your data always stays readable.

### Preferences

| Preference | Default | |
|---|---|---|
| Language | Automatic | English or German. Automatic follows your first macOS language, the same rule Folnaro's helper uses. |
| Helper Path | empty | Only needed when Folnaro lives somewhere unusual: the full path of `folnaro-mcp` inside `Folnaro.app/Contents/MacOS`. |
| Hide when no timer runs (Running Timer) | off | Shows the menu bar item only while a timer runs. |

## Privacy

- The extension talks only to `folnaro-mcp`, the helper inside `Folnaro.app`, over standard input and
  output. It starts one helper process per command and ends it when the command closes. Nothing goes over
  the network, there is no account, no server and no analytics.
- It never opens Folnaro's database; every read and write goes through the helper with the same checks,
  permission switches and audit log as the app. Writes show up in Folnaro's log as the agent "raycast".
- Stored locally by Raycast: the last timer targets you started (project and customer ids, for the Recent
  section), the last search scope and the PDFs you open with Quick Look (in the extension's support folder,
  overwritten on the next preview).

## How it works

`folnaro-mcp` speaks the Model Context Protocol (JSON-RPC 2.0, one message per line). The extension's
client (`src/lib/mcp-client.ts`) spawns the helper, runs the `initialize` handshake (protocol revision
2025-11-25), calls tools with timeouts and turns tool errors into typed errors: Folnaro missing, helper
missing, helper stopped, timeout, switch off, read-only mode, timer already running or not running. Tool
names, arguments and result shapes come from Folnaro's MCP reference (`docs/mcp/*.md` in the Folnaro
repository).

## Development

```sh
npm install
npm run dev        # ray develop, needs Raycast on a Mac
npm test           # vitest with a mock helper replaying JSON-RPC fixtures
FOLNARO_MCP_BIN=<path to folnaro-mcp> npm test   # also against the real helper on a temp database
npm run lint       # ray lint (validates the author against raycast.com, so it needs network)
npm run build      # ray build -e dist
```

The tests start `test/mock-mcp-server.mjs` as the helper. It replays the fixtures in `test/fixtures/`, which
`node test/fixtures/make-fixtures.mjs` writes from the documented result shapes and the helper's own error
texts, with a fictional demo business. To try the extension without real data, set **Helper Path** to the
full path of `test/mock-mcp-server.mjs`; it then serves `test/fixtures/demo.json`. Writes against the demo
fixture answer like Folnaro would but change nothing.

`test/real-helper.test.ts` checks the client against the real `folnaro-mcp` (build it with
`swift build --product folnaro-mcp` in `mac/Packages/FolnaroKit` of the Folnaro repository). It runs only
when `FOLNARO_MCP_BIN` is set and works on a fresh database in a temporary folder (`FOLNARO_DATABASE`),
never on your books.

Icons and screenshots are generated: `dev/icons/generate-icons.mjs` draws the command icons in the brand
petrol, `dev/screenshots/render.mjs` renders the Store screenshots from the mock helper's demo data. The
extension icon is Folnaro's approved app icon, unchanged.
