# Mint for Raycast

Smart disk and memory for you and your agents, from Raycast. [Mint](https://mintstorage.app/r/raycast) keeps your Mac's disk and memory healthy, and judges each item before it offers it: what it is, where it came from, whether it is in use and whether it comes back on its own. It finds what coding agents leave behind (the data Codex, Claude Code and Cursor keep, worktrees that can be made again, old app builds and simulator copies), gets space back without deleting a file by sharing identical copies and compressing idle files in place, cleans what apps make again after one question, and quits idle apps to free memory. Your own files are chosen one by one, and Auto Care can keep doing it on its own. Raycast sends each request to the signed Mint app, which applies the same rules and records as its own window.

## Commands

Every command is a list with a picture beside it: groups on the left, what is in the selected one on the right, and ↵ doing the obvious thing for that group.

- **View Mac Status**: the Mint menu bar dropdown on one screen. On top, what Mint can get back (Optimizable and Safe to clean together), how much piled up in the last 30 days, and the level Mint tells you at. Then Disk and Memory with their Auto Care, and your organized folders with how many files each would sort. ↵ opens Free Disk.
- **Free Disk**: Mint's groups, Optimizable, Safe to clean and Yours, each with what is in it. ↵ optimizes every copy, or deletes everything Safe to clean after one question; your own files are always chosen one by one. While Mint scans, an estimated bar shows how far it is, with where Mint is looking and how many files it has checked.
- **Optimize Storage**: where space can come back without deleting anything, by source: Codex, Claude, Cursor, your files, app data and temporary files. Beside each, its duplicate files with how many copies each has, and its idle files Mint stores compressed in place, the same files Mint's own Optimizable lists. ↵ optimizes them all, ⌘⇧O one source.
- **Free Memory**: Idle, In use and Ask first, each with its apps. ↵ on Idle quits the apps in that group; the others are chosen individually. Releasing memory quits apps: review any ongoing work before confirming.
- **Organize a Folder**: each folder with how many loose files it would sort and where they go. ↵ organizes it.
- **Auto Care**: what Mint does on its own, as the app sets it. Disk: Optimizable, Safe to clean and Yours, each on or off, with what it takes (Yours asks for its types and age first). Memory: on or off, and the level it starts at. Each organized folder: daily at a time you pick, as files arrive, or off. Turning on anything that removes or moves files asks first. ⌘⇧A opens it from View Mac Status, Free Disk, Free Memory and Organize a Folder.
- **Uninstall App**: the selected app and everything it left behind, with the total. ↵ moves them to the Trash after one question.
- **Undo Mint Action**: review recent recoverable operations and restore eligible files that are still available. See the recovery limits below.
- **Show Disk Growth**: what grew most this week, by app and folder, category or AI tool, each with its size over every map Mint has drawn.
- **Empty Trash**: what's in the Trash, largest first. Delete what you pick, or all of it.
- **AI Conversations**: remove pictures from Codex and Claude Code conversations and keep the text, or delete Codex conversations.
- **Mint History**: everything Mint cleaned, freed, organized or uninstalled, by you or by Auto Care.
- **File Handling**: the places Mint never touches, and the ones it asks about first.
- **Cleanup Rules**: see, preview, edit and add the rules behind Mint's cleanup.

Empty Trash, AI Conversations, File Handling and Cleanup Rules need Mint 1.2; with an older Mint, each says to update.

## Ask Mint in Raycast AI

Type `@mint` in Raycast AI and ask in your own words:

- "@mint what's taking up space on my Mac?"
- "@mint how much space can I get back without deleting anything?"
- "@mint which apps are using the most memory right now?"
- "@mint what grew on my disk this week?"

The answers come from Mint and only read. When you want the space or memory back, Mint opens Free Disk, Optimize Storage or Free Memory, and you review and confirm it there.

## Requirements

**Mint Direct is required.** Download it from [mintstorage.app](https://mintstorage.app/r/raycast-download), or run `brew install --cask dzg-studio/mint/mint`, then open Mint once from Applications. Everything here works with Mint 1.2; with an older Mint, some commands do less, and the ones that need a newer Mint say to update.

macOS 14 Sonoma or later.

## Free use and editions

In **Mint Direct**, disk scans and memory release are free and unlimited. Cleaning, organizing, Optimize and app uninstall share **one free 1 GB each week**. Cleanup, Optimize and app uninstall count the bytes they remove or rewrite; organizing counts the size of the files Mint moves. Setup does not count toward it. Auto Care is included and shares the same 1 GB with manual use, including Raycast. Mint Unlimited removes the limit.

The editions have different features and access. Checked November 9, 2026:

| Edition       | Works with this extension? | Features and access                                                                                                                                                                                                             |
| ------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct        | Yes                        | Storage care, organizing, Memory, Uninstall, CLI and MCP.                                                                                                                                                                       |
| Mac App Store | No                         | Storage care and organizing in the folders you allow; no Memory, Uninstall, CLI or MCP. Scans are free; cleaning and organizing share 1 GB each week. Monthly or Lifetime removes the limit.                                    |
| Setapp        | No                         | Storage care, organizing, Memory and Uninstall; no CLI or MCP. Access follows [Setapp's offer for Mint](https://setapp.com/apps/mint), with no Mint in-app cleanup or organizing allowance. Direct's free offer does not apply. |

See [current plans](https://mintstorage.app/pricing/) and [edition terms](https://mintstorage.app/terms/) for the version you use. Redact has been retired and is no longer part of Mint.

## What Undo can recover

Undo can restore eligible file moves, items moved to Trash and supported archive optimizations while the required files and recovery records remain available. The operation journal keeps up to **90 days or 5,000 batches**, whichever limit is reached first; this is a history limit, not a promise that every action is reversible.

**Permanent deletion, emptied Trash and removed conversation media cannot be undone.** Quitting an app to free memory also cannot restore its running tasks. Review the action before confirming and keep backups of important files.

## Mac slow while AI tasks are running?

Start with [the memory-pressure guide](https://mintstorage.app/mac-slow-ai-tasks/) to distinguish memory, CPU and disk problems before acting. It links the memory research and explains what Mint can help with. A cleanup or memory release cannot guarantee an AI task will keep running.

## How it works

The extension never deletes or moves a file itself. It sends a short request to Mint's signed command-line tool after checking DZG Studio's Developer ID signature, and Mint checks every file again right before it acts. Paths on your Ignore list stay untouched. Paths, file names and scan results stay on this Mac; the extension sends nothing anywhere. When you ask Mint in Raycast AI, the answer (sizes, group names and app or folder names) goes to the model Raycast AI uses, like anything else you ask it.

## Usage data

Mint (the app, not this extension) records which command you ran, whether it worked and how long it took, so we can see what helps and fix what breaks. It never records your files, file names, paths, what you typed or what came back. It follows the Share my usage statistics switch on Mint's About page; turn it off there and nothing is recorded.
