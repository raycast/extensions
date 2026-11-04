# Repository behavior and recovery

Saved sheets can be browsed offline. This guide covers repository metadata, sync limits, troubleshooting and local-data recovery.

## Repository frontmatter

Repository sheets can provide optional metadata in a YAML block at the very start of the Markdown file:

```yaml
---
title: Jinja templates
description: Template syntax and examples
tags: [Python, programming]
---
# Jinja reference
```

- A valid `title` overrides the saved H1/filename title in lists, search and sheet details. Missing or invalid titles keep the existing title.
- `description` appears above the sheet body as wrapped plain text and in the details sidebar. Tags appear in lists and details; all three fields are searchable. `category` and other fields are ignored.
- Title and description must be YAML strings; tags must be a YAML sequence of strings. Quote numeric or boolean-looking values if you intend them as text. Whitespace is normalized; duplicate tags are removed without regard to case. Invalid tag entries are skipped.
- The frontmatter block is limited to 65,536 characters. Title, description and individual tags are limited to 200, 1,000 and 64 characters before whitespace normalization. A sequence with more than 20 entries is ignored. Oversized fields are ignored rather than truncated.
- Missing, malformed, duplicate-key, unsupported or unclosed frontmatter uses the saved title and no metadata. YAML aliases are ignored rather than expanded. These fallbacks do not prevent viewing the sheet.

Metadata is derived from cached Markdown offline, so existing sheets do not need a resync. Reading metadata does not rewrite repository snapshots, personal sheets, favorites or hidden state. Opening a sheet still records its existing view history. **Copy Original Markdown** retains the entire source, including frontmatter, line endings and whitespace. Bundled and personal-sheet metadata behavior is unchanged.

## Import a local Markdown file

Open **Manage Custom Cheatsheets**, then choose **Import Markdown File** from Actions. This action is also available when the library is empty.

1. Choose one readable UTF-8 `.md` file, up to **1 MiB**. Uppercase `.MD` is accepted. Empty, binary-like and invalid UTF-8 files are rejected.
2. Review **Title**, **Tags** and **Description**. Valid frontmatter supplies initial metadata using the limits above; otherwise the title uses the filename. You can edit these fields before saving. Edited tags use commas as separators.
3. Choose **Import Markdown File** to save the loaded text as a personal sheet. After a confirmed save, the manager refreshes and the form closes. You can then view, edit or delete the copy like any other custom sheet.

The copy preserves the complete original text, including frontmatter, BOM, line endings and whitespace. It is loaded when you select the file; select it again to pick up later file edits. The original file is never modified. Explicitly selected files are not subject to repository filename exclusions.

**Already Imported** means identical original text is already in your custom collection, including manually created sheets. Nothing is written or overwritten, even if you entered different metadata; the toast names the saved sheet. Different text creates a separate copy, even with the same title. Repository sheets are independent. There is no link to the source path, automatic update or replacement.

Leaving the form before saving does not import anything or change your manual creation drafts. A file or storage error keeps the form open. If saving cannot be confirmed, check the manager before retrying: a completed copy may already exist and the retry will skip identical content. Import selections and metadata edits are not saved as drafts.

## Sync behavior

- Sync downloads one complete revision before changing saved content. A successful sync adds, updates and removes files to match that revision.
- Failed staging (downloads, truncated/malformed trees, timeouts or cancellation) retains the previous snapshot and its successful-sync timestamp. If a storage write cannot be confirmed, check the saved content before retrying: the write may have completed.
- A complete response containing no eligible Markdown files is a successful empty snapshot. GitHub's “empty repository/no commit” error is a failure, not permission to erase cached content.
- Each sync is limited to **300 files**, **1 MiB per Markdown file**, **20 MiB total**, **15 seconds per request** and **2 minutes for staging**. Files download sequentially. There are no automatic network retries.
- Use the sync toast's **Cancel Sync** action while staging. Cancellation is checked before the final storage write; a completed commit cannot be undone by canceling afterwards. Canceling a repository stops the remaining **Sync All Repositories** work.
- Markdown files use `.md` (case-insensitive). Administrative files such as root README/license/changelog files, `.github`, paths beginning with `_`, and names containing `@` are excluded. Names such as `AJAX_Security_Cheat_Sheet.md` are included.
- Removing a repository removes its cached sheets. Stable favorites, hidden state and history are retained so re-adding the same owner, repository and branch restores them.
- To change owner, repository or branch, remove the entry and add it again. This prevents old cached content being relabeled as a different source. Changing a subdirectory applies on the next successful sync.

## Local data and migration

Data stays in Raycast's local extension storage; this extension does not provide cross-device sync. Bundled references are read directly from the installed assets. Remote links/images in Markdown can still require a network connection when opened/rendered.

Version 1.2 uses a validated library snapshot. Original legacy collections remain untouched, and the previous valid snapshot is backed up before each mutation. Invalid or unreadable storage blocks writes instead of being treated as an empty library.

Repository state now identifies the GitHub owner, repository, branch and file path. If two repositories previously shared a slug such as `docs/git`, the extension cannot safely infer which one owned an old favorite, hidden marker or history record. It retains that record, shows a migration warning and leaves both sheets independent. Reapply favorites/hidden state to the intended sheet. Ambiguous historical counts are not assigned automatically.

**Do not downgrade after editing data in 1.2 without backing it up.** Older versions read the retained legacy collections and will not see newer changes. Read [Recover conservatively](#recover-conservatively) before any recovery work.

## Troubleshooting

| Symptom                             | What to check                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sheet missing                       | Clear the type filter; check **Hidden**. For imports, check branch, subdirectory and exclusions.                                                                                     |
| Sync failed                         | Read the error; check network, access and limits, then retry. Your previous snapshot remains available.                                                                              |
| Storage cannot be read/saved        | Retry after closing other extension commands. If it persists, preserve extension data before recovery. Do not reset storage or reinstall over unbacked-up personal sheets.           |
| Draft changed in another command    | Copy the text you want to keep, close the form and reopen it. Concurrent edits are not silently merged.                                                                              |
| Content looks different from GitHub | Raycast renders Markdown, not arbitrary HTML/Jekyll pages. Original source remains available for copying. Relative links in some bundled references may require **Open in Browser**. |

## What changes

| When              | Behavior                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List/library read | Prefer `library-v2`. Invalid JSON/schema blocks access; do not silently fall back to old data.                                                                        |
| No v2 library yet | Read and validate the six legacy collections below. Resolve only unambiguous identities in memory. Reads alone do not write.                                          |
| First mutation    | Save the valid pre-change library to `library-v2-previous`, then write the changed `library-v2`. Opening a sheet records a view, which is a mutation.                 |
| Later mutations   | Repeat backup-before-write under the shared filesystem lock. The backup is the previous valid snapshot, not a permanent archive.                                      |
| Legacy ambiguity  | Keep unmatched or ambiguous repository favorites, hidden markers and counts. Reapply state to the intended sheet; the warning marker remains until reviewed recovery. |

Legacy keys remain unchanged: `custom-cheatsheets`, `user-repositories`, `repository-cheatsheets`, `favorite-cheatsheets`, `hidden-cheatsheets`, `cheatsheet-views`. Old `repo`/`branch` field names are read without inventing missing owner/identity data. Existing personal-sheet and repository-configuration IDs are retained; repository-sheet identities use owner/repository/branch/path.

## Interrupted or failed changes

A backup failure prevents the primary write. Cancellation checked before that write retains the saved library. Automated tests cover interruption between the two API calls and a subsequent successful mutation. Content and sync timestamp share one library value, so they are submitted together.

**A rejected write is not proof that nothing was saved.** [Raycast documents completion of `setItem`](https://developers.raycast.com/api-reference/storage), but does not specify power-loss durability, cross-key transactions or rollback after a lost acknowledgment. Tests cover both a failure before writing and a write that completes before its acknowledgment fails. In the latter case, the new primary can exist alongside the previous valid backup. Check saved content before retrying.

Process termination during the primary write, power loss and stale-lock recovery after a native crash remain unqualified. This release does not promise automatic recovery or a complete transaction across primary, backup and drafts.

## Recover conservatively

1. Stop extension commands. Preserve raw current, previous and all legacy values before changing any key. Keep drafts too if they contain newer text.
2. Validate copies in an isolated development namespace. Compare content, IDs, repository revision/timestamp and state.
3. Restore only a reviewed snapshot containing the desired newer data. Preserve the rejected value for comparison.
4. Reopen and check content before making another change, which would roll the previous-snapshot backup forward.

Do not reset Raycast storage or delete `library-v2` to repair corruption: removing it exposes stale legacy collections. No library recovery or export command is shipped. The single-file import above creates personal copies; it does not restore raw storage or bypass corrupt data. **Copy Original Markdown** can preserve individual sheets in external UTF-8 files; also record titles, tags, descriptions and repository settings. This is separate from preserving raw extension storage.

## Deletion and downgrade

| Action                                       | Retained data                                                                                                                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delete a custom sheet                        | Removes only its current library item, favorite, hidden marker and view history. Other items remain. Legacy collections, the rolling backup and separately saved edit drafts are not purged. This is not secure erasure of every copy. |
| Remove a repository                          | Removes that configuration and its cached sheets. Stable favorites, hidden state and history stay, so re-adding the same owner/repository/branch can restore them. Other repositories remain.                                          |
| Downgrade                                    | Old builds read legacy keys and ignore v2 changes. A new installation with no legacy data can appear empty. New data is not reverse-migrated.                                                                                          |
| Return to v2 after editing with an old build | Existing v2 data still takes precedence; edits made only to legacy collections are not merged automatically. Preserve and reconcile both versions first.                                                                               |

Do not run old and new builds concurrently in the same namespace. Old versions do not honor the new write lock. Before any downgrade, preserve raw snapshots and important Markdown externally and plan a reviewed merge. Changing a repository branch requires removal/re-addition and intentionally uses different state identities.
