# Keysi Changelog

## [Initial Version] - {PR_MERGE_DATE}

- **Search Cheat Sheets** searches every sheet Keysi knows about — the bundled Vim, tmux, Figma and Slack ones, plus anything you wrote yourself — and returns the keys as the row's accessory rather than burying them in a detail pane. Reads the sheet JSON off disk, so it works whether or not Keysi is running
- **Show Shortcuts** opens Keysi's panel for the app you were in before Raycast. Keysi excludes Raycast, Alfred and LaunchBar when it works out which app you meant, so this targets the app you were actually using rather than the launcher
- **Practice Shortcuts** opens Keysi's drill for the shortcuts you keep missing
- Searching matches the sheet name and the group name as well as the command title, so "tmux" or "Panes" finds rows that do not contain those words
- Sheet titles resolve against your macOS language order, not just English — a German sheet read on a German system shows German, falling back through the base language ("pt" for "pt-BR") and then English
- User sheets shadow a built-in of the same id, matching the precedence Keysi itself applies, so an overridden Vim sheet behaves the same in both places
- The commands are part of Keysi Pro. A locked state is shown instead of results, and it distinguishes "you need Pro" from "Keysi has not been launched on this Mac" — the two need different wording, since telling someone who has never opened the app that they need to buy something sends them looking for a purchase they may already own
