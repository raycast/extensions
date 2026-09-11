# Sunsama for Raycast

Create, view, and manage your Sunsama tasks without leaving Raycast.

## FYI

This is an unofficial extension and isn't affiliated with Sunsama. It runs on
Sunsama's official MCP server, so everything it does is something Sunsama
supports on purpose.

## Setup

There isn't any. The first time you run a command, Raycast opens Sunsama in your
browser and asks you to authorize the extension. Approve it and you're done —
access refreshes itself after that, so you shouldn't ever have to think about it
again.

If you do need to disconnect, run **View Today's Tasks** and pick **Sign Out of
Sunsama** from the actions. The next command you run will ask you to sign in
again.

## Commands

### Add Task

Adds a task to today, or whatever day you pick.

The Task field takes three shapes. You can type a plain title, paste a link, or
paste a link followed by a title:

| What you type              | What you get                                  |
| -------------------------- | --------------------------------------------- |
| `Fix the contact form`     | A task with that title                        |
| `<link>`                   | A linked task, titled from the item itself    |
| `<link> Fix the form`      | A linked task titled "Fix the form"           |

Paste a link from anything Sunsama connects to — Trello, GitHub, Todoist,
ClickUp, Jira, Linear, Asana, Notion, Gmail, Slack — and it comes through as a
proper linked task with the provider's icon and a click-through to the original,
not just a URL sitting in the notes. Sunsama does the lookup on its end, so
there's no API key for you to go dig up.

You can also set notes, a channel, a time estimate, subtasks, and whether the
task lands at the top or bottom of the day.

### View Today's Tasks

Today's tasks in Sunsama's own order. From here you can start and stop timers,
mark things complete, edit a task, set planned time, snooze to another day, move
tasks around, open the linked item, manage subtasks, and delete.

Timers work on subtasks too. If a subtask timer is running — even one you started
in the Sunsama web app — hitting Stop Timer on the parent task stops the right
one.

### Set Default Channel

Picks the channel new tasks default to. Sunsama has no "list all channels"
endpoint, only search, so this list is search-driven — start typing and it
narrows.

## Time input

Anywhere you type a duration, all of these work:

| Input    | Meaning       |
| -------- | ------------- |
| `90`     | 90 minutes    |
| `45m`    | 45 minutes    |
| `1h`     | 1 hour        |
| `1h 30m` | 90 minutes    |
| `1:15`   | 1 hour 15 min |

One thing worth knowing: if a task has subtasks with their own planned times,
Sunsama adds those up to get the task's time. So setting a time on the parent
means clearing the subtask times first. The extension asks you before it does
that.

## Development

You'll need Node 22+ and Raycast.

```bash
npm install
npm run dev
```

`npm run dev` loads the commands into Raycast and reloads them when you change a
file. They'll show up in Raycast's root search while it's running.

Before you commit anything, run all three of these:

```bash
npm test         # unit tests
npm run lint     # eslint + prettier
npm run build    # the build Raycast actually publishes
```

The tests cover the pure logic — duration parsing, day math, and the HTML to
Markdown conversion for notes. Sunsama sends task notes as HTML but takes
Markdown back when you save them, so that conversion has to survive a round trip
and it's worth testing on its own. Everything that touches the network gets
tested by running the extension against a real account.

## Project layout

```
src/
  add-task.tsx            Add Task command
  view-today.tsx          View Today's Tasks command
  set-default-channel.tsx Set Default Channel command
  components/             Forms and lists pushed onto the navigation stack
  lib/
    mcp.ts                OAuth, MCP transport, tool and resource calls
    sunsama-client.ts     Tasks, subtasks, channels, timers
    notes.ts              Sunsama notes HTML to Markdown (tested)
    time.ts               Duration parsing (tested)
    date.ts               Day string helpers (tested)
    open-integration.ts   Opens a linked item, preferring the desktop app
```
