# TalkRemind for Raycast

Pause [TalkRemind](https://didact.digital/talkremind/), choose the apps it ignores and read your dictation statistics, all from Raycast. TalkRemind is a macOS menu bar app that notices when you type a lot and reminds you that dictating is faster.

## Setup

**This extension needs the TalkRemind menu bar app, version 0.13 or later, to be running.** It talks to the app over a private local socket and does nothing on its own. Without the app, every command says so.

1. [Download TalkRemind](https://github.com/4IngoJ/TalkRemind/releases/latest) (14-day trial, then a one-time license).
2. Open TalkRemind and finish its setup.
3. Run **Pause Until** in Raycast.

## Commands

| Command | What it does |
|---|---|
| Pause Until | Pause for 30 minutes, 1 or 2 hours, until this evening, until tomorrow morning or until further notice. Type a time (`15:30`) or a length (`45m`, `2h`, `1h30`) for anything else. While paused, the first entry resumes. |
| Toggle Pause | Pauses, or resumes when already paused. Give it a hotkey. The length is a preference of the command. |
| Excluded Apps | The apps TalkRemind ignores, then all other installed apps. Exclude or include one. Excluded apps get no reminders and do not count in the statistics. |
| Exclude or Include Frontmost App | Excludes the app you are in, or includes it again if it is excluded. |
| Statistics | Your dictation share today and over the last 7 days, day by day, the time saved this week and the apps TalkRemind reminded you in today. |

## AI

Ask TalkRemind (or `@talkremind`) about your habits: which apps you type or dictate in most today, over 7 or 30 days, how a week compares with the one before, where reminders get followed or ignored, and in which apps dictating more would pay off. It reads the numbers and suggests concrete changes. It can also pause TalkRemind, resume it, or exclude an app. Changes ask for your confirmation first.

## Privacy

The connection is a Unix socket in `~/Library/Application Support/TalkRemind`, readable only by your macOS user. Nothing leaves your Mac, and the extension never sees what you type: it reads counts of words, not text.
