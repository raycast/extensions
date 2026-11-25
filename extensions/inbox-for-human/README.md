# Inbox for Human

When Claude Code or Codex needs you to review a plan, a report, or a draft, it adds the file to your inbox with a note on what it needs from you. Open Review Inbox for Human from anywhere to see everything waiting on you, open each file, and archive it when you're done.

## Set up

Inbox for Human has two parts: this extension, which shows your inbox, and a free skill for your agent, which adds files to it.

1. Open **Review Inbox for Human** and press ⏎ to copy the install prompt.
2. Paste it into Claude Code or Codex. Your agent installs the [inbox-for-human skill](https://github.com/jasonericsiegel/inbox-for-human). To install it from a terminal instead, see the skill's page.
3. Start a new chat. From now on, files your agent wants you to review show up in Review Inbox for Human.

Your agent needs to run on this Mac. The skill also needs Python 3, which most Macs with Claude Code or Codex already have.

## Commands

### Review Inbox for Human

The files your agent asked you to review, newest first, under Today, Yesterday, and Earlier. Select one to see what the agent wants you to do.

| Shortcut | Action |
|---|---|
| ⏎ | Open the file in its usual app |
| ⌘O | Open it with the app you chose in settings, or pick one |
| ⌘⇧F | Show it in Finder |
| ⌘E | Archive it |
| ⌘⇧E | Archive everything |
| ⌘⇧C | Copy its path |

Opening a file keeps it in your inbox until you archive it. If your agent adds an archived file again, it comes back with the new note.

## Settings

**Open With (⌘O):** the app ⌘O opens files in, Obsidian to start. Files inside an Obsidian vault open there, in a new tab. If Obsidian isn't installed, or a file isn't in a vault, ⌘O lets you pick an app. Clear the setting to pick an app every time.

## Where your inbox is kept

The skill keeps your inbox in a file on your Mac, `~/.agents/inbox-for-human/queue.json`, and this extension reads it. Nothing is sent anywhere.
