# Hopper Changelog

## [Agents] - {PR_MERGE_DATE}

- Agents command: every AI agent running on your Mac (Claude Code in terminals and the Claude app, Codex, Cursor, herdr, agent CLIs), grouped by Needs You, Done, Working, and Idle, filterable by project, and one step from where it runs.
- Next Agent command: jump to the agent that has waited longest for you; run again for the next.
- Jumping to a terminal agent selects its exact iTerm split or cmux terminal.
- Tabs is now **Search** (and Tabs in Current App is **Search Current App**): it shows an agent's status next to the tab it runs in, and lists agents that aren't in a tab. Your hotkeys keep working.
- herdr workspaces and tabs are listed in Search under the terminal running herdr, and agents in herdr panes open in their pane.
- Ghostty tabs are listed in Search (Ghostty 1.3+), and herdr running in Ghostty is brought forward in its own tab.
- cmux workspaces with several terminals also list each terminal by its name; herdr lists workspaces and their named tabs.
- Search lists each agent in its app's section, and shows AppleScript's own error for apps it can't read.
- README: recommended hotkeys for every command, clear of browser, terminal, and editor tab keys.
- Claude Code sessions that haven't started yet (e.g. waiting to trust a folder) are listed as running.
- Copy Resume Command for Claude Code and Codex sessions.
- Search: `⌥→` / `⌥←` jump to the next or previous app's most recent entry.
- Obsidian tabs in Search: every open vault's tabs, in all its windows (popouts too), with each note's folder; closed notes reopen from Recently Closed.
- Bookmarks in Search: `⌘D` bookmarks a tab, page, note, document, or Recently Closed entry. Picking a bookmark jumps to the tab already showing it, in any browser, and opens it only when it isn't open. `⌘E` renames a bookmark.
- Recently Closed jumps to the tab already showing an entry too, instead of opening it a second time; a page that comes back with or without a trailing slash no longer counts as closed.
- Search no longer runs out of memory ("Command Out of Memory") with many Claude Code sessions: only the few fields it needs are read from the Claude app's session files.

## [Tabs] - {PR_MERGE_DATE}

- Tabs command: search tabs, windows, and sessions across running apps (Chromium browsers, Safari, cmux, iTerm, Terminal, Claude, Muse, and any app's windows) and jump to one.
- Tabs in Current App command: the same for the frontmost app.
- Tabs search tolerates typos ("caude" finds Claude) and lists an app's own tabs before tabs that mention its name.
- Claude Code sessions are listed from Claude's session files (all projects, most recent first, sidebar hidden or not) and open via Claude's deep link.
- Notion tabs: the front window's tabs (read from its tab bar) with each page's parent pages, then its other windows.
- Claude Chat and Cowork conversations you've opened open via Claude's deep link, and stay listed with the sidebar hidden.
- Incognito and private browser windows are left out of Tabs entirely.
- Back, Forward, Toggle, and History switch apps like Cmd+Tab when Raycast has Accessibility, so an app returns to the window you left (for example TV's fullscreen player instead of its home screen).
- Recently Closed section in Tabs: reopen browser tabs, Notion pages, and documents closed since Tabs last looked, with Remove and Clear actions.
- Notion tabs open through Notion's own link, which switches to the tab showing the page in any window.

## [Initial Version] - {PR_MERGE_DATE}

- Back and Forward commands, designed for hotkeys.
- Toggle command to flip between your two most recent apps.
- History command listing running apps by recent use.
- Remove from History action in History to hide an app until you use it again, and Exclude from History to hide it for good.
