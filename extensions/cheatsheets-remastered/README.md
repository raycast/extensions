# Cheatsheets Remastered

Local access to bundled [DevHints](https://devhints.io/) developer references, your own Markdown and cached GitHub sheets. Browsing and searching saved content works offline.

## Commands

| Command                   | What you can do                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Show Cheatsheets          | Search titles and content; filter bundled, custom, GitHub, favorite or hidden sheets; open recent sheets. |
| Create Custom Cheatsheet  | Write Markdown with tags and a description. Unsubmitted drafts are saved locally.                         |
| Manage Custom Cheatsheets | View, edit and delete personal sheets.                                                                    |
| Repo Manager              | Add GitHub repositories, choose a branch/subdirectory, sync and inspect the last successful snapshot.     |

Use **Search Within Sheet** from an open sheet (`⌘F` on macOS) to search headings and section text. Results show their parent heading and source line. **Copy Section Markdown** copies the original section; **Copy Original Markdown** copies the entire original sheet, including frontmatter and whitespace.

## GitHub setup

1. Open **Repo Manager** and sign in with GitHub through Raycast's existing OAuth flow if prompted.
2. Choose **Add Repository**. Enter the owner and repository name separately, for example `example` and `developer-notes`.
3. Set the actual branch name (the form defaults to `main`). An optional subdirectory such as `docs` limits imported files. Select **Private Repository** for private sources.
4. Choose **Sync Repository**. Use **Show Cheatsheets** to browse the saved content offline.

Repository management retains the published GitHub OAuth behavior, including the `repo read:org read:user` scopes. The `repo` grant includes write access, although this extension only sends read requests. Both public and private repository sync use the OAuth token. The optional **GitHub Token** preference is retained for compatibility; it does not override repository OAuth. Existing credentials are not cleared by this update.

Bundled and custom sheets do not require GitHub authentication. Do not put tokens in repository URLs, sheet content or support logs.

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

**Do not downgrade after editing data in 1.2 without backing it up.** Older versions read the retained legacy collections and will not see newer changes. See [migration and recovery notes](docs/migration.md) before any recovery work.

## Troubleshooting

| Symptom                             | What to check                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sheet missing                       | Clear the type filter; check **Hidden**. For imports, check branch, subdirectory and exclusions.                                                                                     |
| Sync failed                         | Read the error; check network, access and limits, then retry. Your previous snapshot remains available.                                                                              |
| Storage cannot be read/saved        | Retry after closing other extension commands. If it persists, preserve extension data before recovery. Do not reset storage or reinstall over unbacked-up personal sheets.           |
| Draft changed in another command    | Copy the text you want to keep, close the form and reopen it. Concurrent edits are not silently merged.                                                                              |
| Content looks different from GitHub | Raycast renders Markdown, not arbitrary HTML/Jekyll pages. Original source remains available for copying. Relative links in some bundled references may require **Open in Browser**. |

This extension supports **macOS**.

## Credits

Extension: **Sam McNab / smcnab1**, under the [MIT license](LICENSE).

Bundled references originate from [DevHints](https://devhints.io/) / [rstacruz/cheatsheets](https://github.com/rstacruz/cheatsheets), by Rico Sta. Cruz and contributors. Six references use historical MIT-licensed editions with targeted accuracy corrections; four sheets with unresolved permission evidence are omitted. These references are examples, not a guarantee that every tool version is covered. See [attribution notes](ATTRIBUTION.md).
