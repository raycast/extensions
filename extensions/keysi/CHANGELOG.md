# Keysi Changelog

## [Initial Version] - {PR_MERGE_DATE}

- **Search Cheat Sheets** searches every sheet Keysi knows about — the bundled Vim, tmux, Figma and Slack ones, plus anything you wrote yourself — and returns the keys as the row's accessory rather than burying them in a detail pane. Reads the sheet JSON off disk, so it works whether or not Keysi is running
- **Show Shortcuts** opens Keysi's panel for the app you were in before Raycast. Keysi excludes Raycast, Alfred and LaunchBar when it works out which app you meant, so this targets the app you were actually using rather than the launcher
- **Practice Shortcuts** opens Keysi's drill for the shortcuts you keep missing
- **Show Progress** opens Keysi's recap of the shortcuts you've learned
- Search Cheat Sheets and Show Shortcuts both take an optional query as an argument, so `split` or `save` can be typed straight into Raycast's root search
- The sheet for the app you were just in floats to the top of the results, labelled with why — a sheet declares which apps it is about, and this uses the same rules Keysi's own overlay does
- Rows you've used recently come first until you start typing; copying a row's keys or opening it in Keysi is what remembers it, and nothing leaves this Mac
- Each row can copy its keys, copy the command name, copy the pair as a Markdown bullet, open the row in Keysi's panel, or reveal the sheet file that produced it
- Searching matches the sheet name and the group name as well as the command title, so "tmux" or "Panes" finds rows that do not contain those words
- Sheet titles render in US English, per the store's guideline on localization — every other string these commands show is English, so resolving rows to the system language produced a half-translated list rather than a translated one. Keysi's own sheets carry nine languages and its overlay still uses whichever matches your Mac; this is the Raycast surface
- User sheets shadow a built-in of the same id, matching the precedence Keysi itself applies, so an overridden Vim sheet behaves the same in both places
- A **Keysi Application** preference, for installs that aren't in `/Applications` or `~/Applications`. The usual locations are still searched behind it
- The commands are part of Keysi Pro. A locked state is shown instead of results, and it distinguishes "you need Pro" from "Keysi has not been launched on this Mac" — the two need different wording, since telling someone who has never opened the app that they need to buy something sends them looking for a purchase they may already own. It links straight to Keysi's License settings, and re-checks with ⌘R, so a purchase made from that screen takes effect without restarting anything
