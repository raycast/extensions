# Mash for Raycast

Search the history of your coding agents from Raycast, as you type.

**Search Mash** shows your latest chats on this machine before you type, and
then the chats that match what you type. Each row names the chat, its project
and, for another machine's chat, that machine, with its agent's logo and when
it was last active; rows are grouped **Today**, **This week** and **Earlier**
by last activity, best match first within each group.
It asks every source at once: this machine by words, this machine by meaning
(once it is set up), and your other machines. Results join the list as each
answers; once you move the selection, the rows on screen keep their places and
later results are added below them in their group. A chat found only by
meaning is tagged **by meaning**, and a machine that doesn't answer is listed
with **↵ to retry**.
The dropdown beside the search field chooses what to list, **Chats** (one row
per chat) or **Messages** (one row per matching message), and whose history,
**All machines** or **This machine**; ⌘1 and ⌘2 switch between chats and
messages from any row, and the choice is remembered. Chats your agents started
as subagents are left out unless you turn on **Include matches in subagent
chats** in the extension's preferences. Type a query after **Search Mash** in
Raycast's root search to start with it.
From a chat you can:

- **Open Chat in Mash** (↵) — the chat, at the matching message, in the Mash
  desktop app. Without the app, ↵ copies the way back into the chat instead
  (**Copy Resume Command**, or **Copy Message ID** for a chat that can't be
  resumed here), and **Get the Mash App** opens the
  [downloads page](https://getmash.io/downloads/).
- **Show Glance** (⌘Y) — a pane beside the list with the matching message
  and the one said before and after it, without leaving Raycast: your own
  messages as quotes, the words you searched for in bold, and code as it was
  written. Tool calls, their output and the agent's thinking are passed over,
  and long messages are cut short. Under them are the chat's agent, project,
  machine, when it was last active and how many messages it has, with the
  match's place among them. ⌘Y again hides it; the choice is remembered.
- **Open in Codex** or **Open in Claude** (⌘O) — the session in its agent's
  own app: a Codex thread in the ChatGPT app, or a Claude Code session in the
  Claude app, in the folder it ran in. For a session the Claude app doesn't
  have yet, the action reads **Add to Claude**, since the app adds it as a new
  session. Offered only when that app is installed.

Under **Copy**:

- **Copy Resume Command** (⇧⌘R) — `claude --resume …` or `codex resume …`,
  in the folder the chat ran in, to pick the session up in a terminal.
  Offered for this machine's own Claude Code and Codex sessions.
- **Copy Link** (⇧⌘C) — a `mash://` link to the chat, which opens in the
  desktop app. Without the desktop app this is **Copy Message ID** (⇧⌘C)
  instead: the ID that `mash view` and your agents' Mash tools read the
  message by.
- **Copy Passage** — the matching passage.

Under **Show**, while searching:

- **List Messages** (⌘2) or **List Chats** (⌘1).
- **Search Everywhere** (⇧⌘F) — the same words in Mash's full search, which
  also reads your other machines, matches exact identifiers and can search by
  meaning. Without the desktop app, this is **Copy Search Command**, the
  `mash search` command that does the same in a terminal.
- **Include Subagent Chats…** — the extension's preferences, while subagent
  chats are left out.

**Search Memory** lists the decisions, preferences and notes Mash remembers
from your chats on every machine (through the shared index, or this
machine's alone when it has not joined one), grouped by the repository or
project they apply to, newest first. Choose a kind beside the search field. Each shows why it was recorded,
when it applies, the quotes from the chat behind it, and the agent that
recorded it. **Open Source Chat in Mash** (↵, with the desktop app) goes to
the message it came from, and **Copy Statement** copies it; without the app,
↵ copies the statement and **Get the Mash App** opens the downloads page. A record an agent proposed that you haven't
confirmed is tagged **unconfirmed**.

When Mash fails, the extension shows Mash's own message with the next steps:
try again, the [troubleshooting guide](https://getmash.io/troubleshooting/),
the installation guide, or **Set Mash Location**.

## Requirements

[Mash](https://getmash.io/installation/), set up with `mash init` and indexed.
The extension runs `mash list-chats --local --exclude-subagents`,
`mash search --live --stream` (stopped as soon as the search text changes),
`mash view` and, for Search Memory, `mash memory`, so it needs a Mash release
that has them. It finds `mash` in the usual
install locations (the install script, Homebrew, cargo-binstall, mise, or the
Mash desktop app in `/Applications` or `~/Applications`); set **Mash
Executable** in the Mash extension's preferences if yours is elsewhere.

The extension reads only. It never changes, forgets or indexes anything.
Chat text keeps its Markdown formatting, but images are shown as links and raw
HTML as text, so nothing in your history can load a remote image on its own.
