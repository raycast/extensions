# Mash for Raycast

Search the history of your coding agents from Raycast, as you type.

**Search Mash** shows your latest chats on this machine before you type, and
then the chats that match what you type, each with the passage that matched.
It asks every source at once: this machine by words, this machine by meaning
(once it is set up), and your other machines. Results join one list as each
answers; once you move the selection, the rows on screen keep their places and
later results are added below. A chat found only by meaning is tagged **by
meaning**, and a machine that doesn't answer is listed with **↵ to retry**.
The dropdown beside the search field chooses what to list, **Chats** (one row
per chat) or **Messages** (one row per matching message), and whose history,
**All machines** or **This machine**; ⌘1 and ⌘2 switch between chats and
messages from any row, and the choice is remembered. Chats your agents started
as subagents are left out unless you turn on **Include matches in subagent
chats** in the extension's preferences. Type a query after **Search Mash** in
Raycast's root search to start with it.
From a chat you can:

- **Open Chat in Mash** (↵) — the chat, at that message, in the Mash desktop
  app. Offered only when the app is installed.
- **Open in Codex** or **Open in Claude** (⇧⌘O) — the session in its agent's
  own app: a Codex thread in the ChatGPT app, or a Claude Code session in the
  Claude app, in the folder it ran in. For a session the Claude app doesn't
  have yet, the action reads **Add to Claude**, since the app adds it as a new
  session. Offered only when that app is installed.
- **Read Messages** — the match with a few messages on either side, without
  leaving Raycast. This is the main action when the desktop app is not
  installed.
- **Copy Link** (⇧⌘C) — a `mash://` link to the chat, which opens in the
  desktop app. Offered only when the app is installed.
- **Copy Message ID** — the ID that `mash view` and your agents' Mash tools
  read the message by (⇧⌘C without the desktop app).
- **Copy Passage** (⇧⌘.).
- **Copy Resume Command** (⇧⌘R) — `claude --resume …` or `codex resume …`,
  in the folder the chat ran in, to pick the session up in a terminal.
  Offered for this machine's own Claude Code and Codex sessions.
- **Search Everywhere** (⌘↵) — the same words in Mash's full search, which
  also reads your other machines, matches exact identifiers and can search by
  meaning. Without the desktop app, this copies the `mash search` command
  that does the same in a terminal.
- **Open Mash** (⌘O) — the desktop app's main window.

**Search Memory** lists the decisions, preferences and notes Mash remembers
from your chats on every machine (through the shared index, or this
machine's alone when it has not joined one), grouped by the repository or
project they apply to, newest first. Choose a kind beside the search field. Each shows why it was recorded,
when it applies, and the quotes from the chat behind it; **Open Source Chat in
Mash** or **Read Source Messages** (⌘O) goes to the message it came from, and
**Copy Statement** (↵) copies it. A record an agent proposed that you haven't
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

The extension reads only. It never changes, forgets or indexes anything, and
it shows chat text as plain text, so nothing in your history can load a remote
image or link.

## Development

```sh
npm install
npm run dev     # opens the extension in Raycast
npm test        # the parsing and link tests
npm run lint
```

The extension uses npm, as Raycast's Store expects a `package-lock.json`.

## Before submitting to the Store

- **`author`**, **`owner`** and **`access`**: `author` is James's Raycast
  username, `james_ko`; `owner` is the MashHQ organization, `mashhq`; and
  `"access": "public"` sends it to the public Store (an `owner` alone
  publishes to the organization's private store). `npm run lint` checks the
  organization against Raycast's API, which finds it only for a signed-in
  member, so run it after `ray login` on a Mac.
- **Screenshots**: `metadata/mash-1.png` to `mash-5.png`, 2000 × 1250 PNG:
  recent chats, a search with matches, **Read Messages**, the action panel,
  and no matches. They were taken from made-up chats in a separate home
  folder (the **Mash Executable** preference pointed at a wrapper that sets
  `HOME`), never real history. Retake them the same way when the UI changes.
