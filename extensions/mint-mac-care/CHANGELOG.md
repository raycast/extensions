# Mint Changelog

## [Everything Mint does, from Raycast] - 2026-11-11

- New commands:
  - **Auto Care**: turn Mint's automatic care for disk, memory and folders on or off, without opening Mint.
  - **Empty Trash**: see what's in the Trash, largest first, and delete what you pick.
  - **AI Conversations**: remove pictures from Codex and Claude Code conversations and keep the text, or delete Codex conversations.
  - **Mint History**: everything Mint cleaned, freed, organized or uninstalled.
  - **File Handling**: the places Mint never touches, and the ones it asks about first.
  - **Cleanup Rules**: see, preview, edit and add the rules behind Mint's cleanup.
- **Optimize Storage** now also compresses idle files in place, like the app. Nothing is deleted.
- **View Mac Status** leads with how much space you can get back, and how much of this week's free 1 GB is left.
- **Free Disk** finds what Mint's Disk page finds, similar photos included, counts each file once, and its progress bar no longer stalls halfway.
- **Organize a Folder** can stop managing a folder. Its files stay where they are.
- When this week's free 1 GB runs out, Raycast shows Mint's plan page: what the space Mint gives back is worth over 3 years, what is ready now, and Buy One-Time or Start Rent-to-Own, right there.
- Empty Trash, AI Conversations, File Handling and Cleanup Rules confirm in Mint's own window before they delete anything or let Mint do more. Auto Care asks in Raycast before it turns on anything that deletes or moves files or quits apps.
- ⌘↵ now only shows or opens. Actions that delete, move, quit or change a setting have their own keys: ⌃X to remove or move to the Trash, ⌃⇧X to empty the whole Trash, ⌘⇧O to optimize one source or archive, ⌘⇧X to quit chosen apps or turn off a folder's Auto Care, ⌘⇧A to organize a folder as files arrive.
- A new look to match Mint: fine dots instead of bars and rings, in light and dark.
- Update to Mint 1.2 to get all of this. With an older Mint, commands that need it ask you to update.

## [The current free allowance] - 2026-10-18

- The first page before Mint is installed states today's free use: cleaning, organizing, Optimize and app uninstall share one free 1 GB each week. It no longer promises a free first clean of any size, which Mint stopped offering in 1.0.97.

## [Easier to find] - 2026-10-16

- The listing says what Mint is for: Mac storage cleanup and optimization for you and your AI agents.
- Commands come up for more of what people search, like cleanup, deep clean, optimizer, Xcode, node_modules, Claude Code and Cursor.

## [Clearer access, recovery and AI answers] - 2026-10-12

- Installation guidance now explains Direct's weekly free allowances and the differences between editions.
- Undo guidance explains which actions can be recovered and when recovery is no longer possible.
- A new guide helps you check a slow Mac while AI tasks are running before quitting apps or cleaning files.
- When Mint does not answer, Raycast AI says so instead of saying the Mac has not been scanned.
- With an older Mint, disk sizes are read in the units Mint writes them, and a full disk's 0 bytes free is shown.
- Without Mint installed, asking Raycast AI to open a Mint command says how to get Mint instead of opening a command that cannot run.

## [Ask Mint in Raycast AI] - 2026-10-05

- Ask Mint in Raycast AI: "@mint what's taking up space?", "@mint which apps are using the most memory?", "@mint what grew on my disk this week?" The answers come from Mint and only read. To act, Mint opens Free Disk, Optimize Storage or Free Memory for you to review and confirm.
- The commands are easier to find in Raycast's search: cleaner, junk, disk space, duplicates, uninstaller, system data and more.
- Without Mint yet, the first page also offers one line for Homebrew: `brew install --cask dzg-studio/mint/mint`.

## [Optimize, Organize and a status at a glance] - 2026-10-01

- Every command is a list with a picture: groups on the left, what is in each on the right, ↵ acting on the whole group.
- View Mac Status is the Mint menu bar dropdown on one screen: Disk and Memory rings with their Auto Care, and your organized folders with how many files each would sort.
- Free Disk shows Mint's groups: ↵ optimizes every identical copy or deletes everything Safe to clean after one question; your own files are chosen one by one.
- New: Optimize Storage, by source (Codex, Claude, Cursor, your files, app data, temporary files), each with its duplicate files and their copies.
- Free Memory: ↵ on Idle quits every idle app. Sizes are Mint's own, scaled to the memory macOS reports in use, so they match the app.
- New: Organize a Folder, with how many files each folder would sort and where they go.
- Uninstall App shows the app and its leftovers with the total as you move through the list.
- Undo Mint Action shows which files each run moved and where.
- New: Show Disk Growth, what grew most this week by app and folder, category or AI tool, with a chart over every map Mint has drawn. It replaces Explain Disk Growth or File Activity.
- Long scans show a bar of how far Mint is and how many files it has read, never a clock. Free Disk and Optimize Storage list their groups from the first second and fill them as Mint answers.
- What goes is struck and folds away row by row, and what came back stays on screen. With Mint 1.0.81 the rows go while Mint works. Organizing a folder, uninstalling and undoing no longer close Raycast when they finish.
- Uninstall App: ↵ always uninstalls, even before Mint has finished looking at the app. A running app is asked to quit first, and nothing moves while it runs.
- Quick Redact and Full Redact are gone: Redact is no longer part of Mint. Review AI Agent Storage is gone too: what each AI tool can give back now leads Optimize Storage, where you can act on it.
- Requires Mint 1.0.80 or later from mintstorage.app. With Mint 1.0.81 or later, the progress bars are live, Free Disk uses the Disk page's own groups, and one scan serves every group.

## [AI Agent Storage and Mac Care] - 2026-09-04

- Review what Codex, Claude Code, Claude Desktop, Cursor, and other AI tools keep on this Mac.
- See conversation age, archived Codex storage, and media Mint could compress while keeping the text readable.
- Scan and clean disk space after reviewing every item.
- Release memory and uninstall apps with their leftovers.
- Undo recoverable Mint actions from Raycast.
- Keep Mint's Boundaries, plan allowance, history, and Developer ID checks across both interfaces.

## [Initial Version] - 2026-08-23

- View Mint disk status, recent activity, and managed folders.
- Run a read-only reclaimable-space scan.
- Explain storage growth or Mint activity involving a path.
- Verify Mint's Developer ID signature and CLI compatibility contract before execution.
