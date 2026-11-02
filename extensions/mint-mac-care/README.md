# Mint for Raycast

Mac storage cleanup and optimization for you and your AI agents, from Raycast. [Mint](https://mintstorage.app/r/raycast) finds caches, Xcode builds, `node_modules`, duplicate files and the gigabytes Codex, Claude Code and Cursor keep, and tells you what each one is, where it came from and whether it is in use. Identical copies share their storage without deleting anything, what apps make again is cleaned after one question, and your own files are chosen one by one. Mint's Auto Care can repeat the routines you turn on, on a schedule. Raycast sends each request to the signed Mint app, which applies the same rules and records as its own window.

## Commands

Every command is a list with a picture beside it: groups on the left, what is in the selected one on the right, and ↵ doing the obvious thing for that group.

- **View Mac Status**: the Mint menu bar dropdown on one screen. Disk and Memory rings with their Auto Care, and your organized folders with how many files each would sort.
- **Free Disk**: Mint's groups, Optimizable, Safe to clean and Yours, each with what is in it. ↵ optimizes every copy, or deletes everything Safe to clean after one question; your own files are always chosen one by one. While Mint scans, a bar shows how far it is and how many files it has read.
- **Optimize Storage**: where space can come back without deleting anything, by source: Codex, Claude, Cursor, your files, app data and temporary files. Beside each, its duplicate files and how many copies each has. ↵ optimizes them all, ⌘↵ one source.
- **Free Memory**: Idle, In use and Ask first, each with its apps. ↵ on Idle quits the apps in that group; the others are chosen individually. Releasing memory quits apps: review any ongoing work before confirming.
- **Organize a Folder**: each folder with how many loose files it would sort and where they go. ↵ organizes it.
- **Uninstall App**: the selected app and everything it left behind, with the total. ↵ moves them to the Trash after one question.
- **Undo Mint Action**: review recent recoverable operations and restore eligible files that are still available. See the recovery limits below.
- **Show Disk Growth**: what grew most this week, by app and folder, category or AI tool, each with its size over every map Mint has drawn.

## Ask Mint in Raycast AI

Type `@mint` in Raycast AI and ask in your own words:

- "@mint what's taking up space on my Mac?"
- "@mint how much space can I get back without deleting anything?"
- "@mint which apps are using the most memory right now?"
- "@mint what grew on my disk this week?"

The answers come from Mint and only read. When you want the space or memory back, Mint opens Free Disk, Optimize Storage or Free Memory, and you review and confirm it there.

## Requirements

**Mint Direct is required.** Download it from [mintstorage.app](https://mintstorage.app/r/raycast-download), or run `brew install --cask dzg-studio/mint/mint`, then open Mint once from Applications. The extension supports Mint 1.0.80 or later; use the latest Direct version for current features and allowances. Mint 1.0.81 adds live progress and the Disk page's groups.

macOS 14 Sonoma or later.

## Free use and editions

In **Mint Direct 1.0.96 and later**, disk scans and memory release are free and unlimited. Cleaning, organizing, Optimize and app uninstall share **one free 1 GB each week**. Cleanup, Optimize and app uninstall count the bytes they remove or rewrite; organizing counts the size of the files Mint moves. Setup does not count toward it. Auto Care is included and shares the same 1 GB with manual use, including Raycast. Mint Unlimited removes the limit.

The editions have different features and access. Checked October 12, 2026:

| Edition       | Works with this extension? | Features and access                                                                                                                                                                                                                  |
| ------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Direct        | Yes                        | Storage care, organizing, Memory, Uninstall, CLI and MCP. The free allowance above applies from 1.0.96; earlier versions have different limits.                                                                                      |
| Mac App Store | No                         | Storage care and organizing; no Memory, Uninstall, CLI or MCP. Public version 1.0.84 has unlimited scans and manual organizing, plus a one-time 1 GB cleanup allowance. Monthly or Lifetime removes the limit and enables Auto Care. |
| Setapp        | No                         | Storage care, organizing, Memory and Uninstall; no CLI or MCP. Access follows [Setapp's offer for Mint](https://setapp.com/apps/mint), with no Mint in-app cleanup or organizing allowance. Direct's free offer does not apply.      |

See [current plans](https://mintstorage.app/pricing/) and [edition terms](https://mintstorage.app/terms/) for the version you use. Redact has been retired and is no longer part of Mint.

## What Undo can recover

Undo can restore eligible file moves, items moved to Trash and supported archive optimizations while the required files and recovery records remain available. The operation journal keeps up to **90 days or 5,000 batches**, whichever limit is reached first; this is a history limit, not a promise that every action is reversible.

**Permanent deletion, emptied Trash and removed conversation media cannot be undone.** Quitting an app to free memory also cannot restore its running tasks. Review the action before confirming and keep backups of important files.

## Mac slow while AI tasks are running?

Start with [the memory-pressure guide](https://mintstorage.app/mac-slow-ai-tasks/) to distinguish memory, CPU and disk problems before acting. It links the memory research and explains what Mint can help with. A cleanup or memory release cannot guarantee an AI task will keep running.

## How it works

The extension never deletes or moves a file itself. It sends a short request to Mint's signed command-line tool after checking DZG Studio's Developer ID signature, and Mint checks every file again right before it acts. Paths on your Ignore list stay untouched. Paths, file names and scan results stay on this Mac; the extension sends nothing anywhere. When you ask Mint in Raycast AI, the answer (sizes, group names and app or folder names) goes to the model Raycast AI uses, like anything else you ask it. If you share Mint's usage statistics, Mint can note that an action started in Raycast.
