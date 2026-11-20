# Day One

Search, write, and sync your [Day One](https://dayoneapp.com) journals from Raycast, on macOS and Windows. Find entries by what they mean (on a Mac), read them in full, add to today's Daily Chat, and ask Raycast AI questions about your entries.

The extension runs the [Day One CLI](https://github.com/Automattic/DayOne-Cli) (`@dayone/cli`). The CLI keeps a copy of your journals on your computer, so search works without the Day One app.

## Get Started

Open **Run Doctor**. It checks each step and can do most of them for you:

1. **Install the CLI.** Choose Install for Me, or run `npm install -g @dayone/cli` yourself. Installing it needs [Node.js](https://nodejs.org).
2. **Sign in** with your Day One email and password. If you sign in to Day One with Apple or Google, set a password in Day One first.
3. **Add your encryption key**, if your journals are end-to-end encrypted. To find it, open Journals in the Day One app on a device you already use and choose Show Encryption Key.
4. **Sync.** Search Entries and Add Entry start the first sync for you. It downloads every journal and can take a few minutes on a large account.

On Day One's free plan, only one device syncs, and the CLI counts as one. Signing in here can stop sync on your phone.

## Commands

### Search Entries

On a Mac, search by meaning: "times I felt burned out" can find entries that never use those words. With an empty search bar, it lists your newest entries by month. It shows up to 50 entries at a time. Filters narrow the list.

- Pick a journal from the dropdown in the search bar.
- **Filter by Tag** narrows the list to one of an entry's tags. **Show Entries at…** narrows it to an entry's place.
- **Go to Entry** opens the whole entry in Raycast. On a Mac, **Open in Day One** opens it in the app.
- **Open in Maps** shows an entry's place: Apple Maps on a Mac, Google Maps on Windows.
- The sidebar shows the journal, date, place, tags, and how many photos and recordings an entry has. Hide it with ⌘⇧D (Ctrl+Shift+D on Windows).

On a Mac, the first time you open Search Entries it downloads a search model of about 90 MB, once. Run Doctor can download it ahead of time.

### Add Entry

Write an entry in Markdown, pick a journal and a date, and save. Your most-used journals come first. After you save, the extension runs a fresh sync to upload the entry. If a sync is already running, it waits for that one to finish first. If the upload fails, the entry stays saved on your computer and goes up with the next sync. Turn off **Sync after saving** in the command's preferences to wait for the next sync instead. If you close the form before saving, Raycast keeps your text, journal, and date as a draft.

### Add to Daily Chat

Type a message after the command name and press Enter. It goes into today's Daily Chat. On a Mac, **Open Daily Chat** in the confirmation opens it in the app. Day One's replies need a Gold plan; your own messages are kept on every plan.

### Sync Day One

Downloads new entries and uploads the ones you wrote, with a running count. When you open Search Entries or Add Entry, they also sync on their own if the last sync started more than 15 minutes ago.

### Run Doctor

Shows what's set up and what isn't, and fixes the common problems:

- install or update the CLI
- sign in or out (signing out deletes this computer's copy of your journals, so it's blocked until every change has uploaded)
- add the encryption key
- sync
- download the search model
- rebuild the search index (Mac)
- turn background sync and the CLI's telemetry on or off
- install agent skills for AI coding tools

**Copy Doctor Report** copies the CLI's own checks. The CLI leaves journal and entry IDs out of it; read it before you share it.

## Raycast AI

Mention `@day-one` in Raycast AI:

- "@day-one what did I write about the lake trip?"
- "@day-one how many entries mention running?"
- "@day-one what was I doing on this day five years ago?"
- "@day-one save an entry in my Journal journal: finished the first draft of the talk"

Raycast AI can search your entries, read one (up to 100,000 characters), and list your journals. Counts cover up to 500 matching entries. Before it writes an entry, Raycast shows you the journal and the start of the text and asks you to confirm.

## Agent Skills

Run Doctor can install [Day One's agent skills](https://github.com/bloom/dayone-cli-skills), which teach AI coding tools such as Claude Code, Codex, and Cursor to use the CLI. After installing, choose **See How to Use Them** for example prompts.

## Coming From Version 1

Version 1 used the CLI built into the Day One Mac app. That CLI is also called `dayone`, so Day One recommends renaming it to `dayone-mac`. Run Doctor offers to do this for you, or you can run:

```sh
sudo mv -n /usr/local/bin/dayone /usr/local/bin/dayone-mac
```

`-n` leaves an existing `dayone-mac` alone.

If an AI app runs Day One's Mac MCP server with `dayone mcp`, change its command to `dayone-mac mcp`. Run Doctor lists the app configs it finds.

## Troubleshooting

- **"Allow Keychain Access":** on a Mac, the CLI keeps your encryption key in the keychain, and macOS can only ask for permission in Terminal. Run `dayone sync` once in Terminal and choose Always Allow.
- **A search misses an entry you know is there** (Mac): open Run Doctor and choose Rebuild Search Index. It runs in the background, shows a count while Doctor is open, and keeps going if you close Raycast.
- **The CLI isn't found:** if you installed it somewhere unusual, set its path in the extension's preferences.
- **Something else:** failure messages usually have a Copy Error action. Turn on **Debug Logging** in the extension's preferences for more detail in the console.

## Limitations

- **Photos and audio:** the CLI can't download attachments yet ([DayOne-Cli#39](https://github.com/Automattic/DayOne-Cli/issues/39)). Entries show how many they have; on a Mac, open the entry in Day One to see them.
- **Windows:** the CLI's Windows version has no search model, so search finds exact words, not meaning.
- **Editing:** the extension writes new entries. It doesn't edit existing ones.

## Privacy

- The extension passes your password and encryption key to the CLI and never stores them. The CLI saves a sign-in token on your computer and keeps the key in your system keychain.
- The extension doesn't log your entries, search text, or email address. Debug Logging records which commands ran, how long they took, and counts like how many results came back. Before it logs an error message from the CLI, the logger hides email addresses, tokens, and similar values. To share a log, turn on **Strict Redaction** before you reproduce the problem, then share only the new lines.
- The CLI's optional telemetry sends usage analytics to Automattic, never journal content. The extension turns it on only if you choose Turn on Telemetry in Run Doctor, which also shows whether it's on and can turn it off.
