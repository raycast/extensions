# Migration and recovery

## What changes

| When              | Behaviour                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List/library read | Prefer `library-v2`. Invalid JSON/schema blocks access; do not silently fall back to old data.                                                                        |
| No v2 library yet | Read and validate the six legacy collections below. Resolve only unambiguous identities in memory. Reads alone do not write.                                          |
| First mutation    | Save the valid pre-change library to `library-v2-previous`, then write the changed `library-v2`. Opening a sheet records a view, which is a mutation.                 |
| Later mutations   | Repeat backup-before-write under the shared filesystem lock. The backup is the previous valid snapshot, not a permanent archive.                                      |
| Legacy ambiguity  | Keep unmatched or ambiguous repository favorites, hidden markers and counts. Reapply state to the intended sheet; the warning marker remains until reviewed recovery. |

Legacy keys remain unchanged: `custom-cheatsheets`, `user-repositories`, `repository-cheatsheets`, `favorite-cheatsheets`, `hidden-cheatsheets`, `cheatsheet-views`. Old `repo`/`branch` field names are read without inventing missing owner/identity data. Existing personal-sheet and repository-configuration IDs are retained; repository-sheet identities use owner/repository/branch/path.

## Interrupted or failed changes

A backup failure prevents the primary write. Cancellation checked before that write retains the saved library. Native synthetic tests verify interruption between the two API calls and a subsequent successful mutation. Content and sync timestamp share one library value, so they are submitted together.

**A rejected write is not proof that nothing was saved.** [Raycast documents completion of `setItem`](https://developers.raycast.com/api-reference/storage), but does not specify power-loss durability, cross-key transactions or rollback after a lost acknowledgement. Tests cover both a failure before writing and a write that completes before its acknowledgement fails. In the latter case, the new primary can exist alongside the previous valid backup. Check saved content before retrying.

Process termination during the primary write, power loss and stale-lock recovery after a native crash remain unqualified. This release does not promise automatic recovery or a complete transaction across primary, backup and drafts.

## Recover conservatively

1. Stop extension commands. Preserve raw current, previous and all legacy values before changing any key. Keep drafts too if they contain newer text.
2. Validate copies in an isolated development namespace. Compare content, IDs, repository revision/timestamp and state.
3. Restore only a reviewed snapshot containing the desired newer data. Preserve the rejected value for comparison.
4. Reopen and check content before making another change, which would roll the previous-snapshot backup forward.

Do not reset Raycast storage or delete `library-v2` to repair corruption: removing it exposes stale legacy collections. No recovery/export/import command is shipped. **Copy Original Markdown** can preserve individual sheets in external UTF-8 files; also record titles, tags, descriptions and repository settings. This is separate from preserving raw extension storage.

## Deletion and downgrade

| Action                                       | Retained data                                                                                                                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delete a custom sheet                        | Removes only its current library item, favorite, hidden marker and view history. Other items remain. Legacy collections, the rolling backup and separately saved edit drafts are not purged. This is not secure erasure of every copy. |
| Remove a repository                          | Removes that configuration and its cached sheets. Stable favorites, hidden state and history stay, so re-adding the same owner/repository/branch can restore them. Other repositories remain.                                          |
| Downgrade                                    | Old builds read legacy keys and ignore v2 changes. A new installation with no legacy data can appear empty. New data is not reverse-migrated.                                                                                          |
| Return to v2 after editing with an old build | Existing v2 data still takes precedence; edits made only to legacy collections are not merged automatically. Preserve and reconcile both versions first.                                                                               |

Do not run old and new builds concurrently in the same namespace. Old versions do not honour the new write lock. Before any downgrade, preserve raw snapshots and important Markdown externally and plan a reviewed merge. Changing a repository branch requires removal/re-addition and intentionally uses different state identities.
