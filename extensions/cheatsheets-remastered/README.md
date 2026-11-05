# Cheatsheets Remastered

Browse bundled [DevHints](https://devhints.io/) references, your own Markdown and saved GitHub cheatsheets in Raycast on macOS. Search titles, content and repository metadata, keep favorites and return to recently opened sheets.

[Install from the Raycast Store](https://www.raycast.com/smcnab1/cheatsheets-remastered)

## Commands

| Command                   | Use it to                                                                        |
| ------------------------- | -------------------------------------------------------------------------------- |
| Show Cheatsheets          | Search and filter bundled, custom and repository sheets.                         |
| Create Custom Cheatsheet  | Write Markdown with a description and tags; unfinished drafts are saved locally. |
| Manage Custom Cheatsheets | View, edit and delete your personal sheets.                                      |
| Repo Manager              | Add GitHub repositories and sync their Markdown for offline access.              |

Open a sheet and use **Search Within Sheet** (`⌘F`) to find headings and text. **Copy Section Markdown** copies a section; **Copy Original Markdown** preserves the complete source, including frontmatter and whitespace.

## Import a local Markdown file

Open **Manage Custom Cheatsheets** and choose **Import Markdown File** from Actions. Select one UTF-8 `.md` file (up to 1 MiB), review its title, tags and description, then import it as a personal copy. The original file stays unchanged; identical saved content is skipped.

## Add a GitHub repository

Bundled and custom sheets work without a GitHub account. To import repository sheets:

1. Open **Repo Manager** and sign in with GitHub when prompted.
2. Choose **Add Repository**. Enter **Owner** and **Repository Name** separately.
3. Enter the actual **Default Branch**; the form starts with `main`. Optionally set a subdirectory and select **Private Repository** for a private source.
4. Choose **Sync Repository**, then browse the saved sheets in **Show Cheatsheets**.

Sync uses GitHub OAuth with `repo read:org read:user` scopes. The `repo` grant includes write access, although the extension only makes read requests. The optional **GitHub Token** preference does not override OAuth.

## Offline use and help

Saved content stays in Raycast's local extension storage, without cross-device sync. Downloading updates and opening remote links or images can require a connection. A failed download retains the previous repository snapshot.

See [repository behavior and recovery](docs/migration.md) for metadata, import limits, sync exclusions and troubleshooting. Back up local data before downgrading; older versions cannot read newer changes. Never include tokens or private sheet content in [issue reports](https://github.com/smcnab1/cheatsheets-remastered/issues).

## Maintenance and credits

I maintain this extension as Sam McNab ([smcnab1](https://github.com/smcnab1)). Development setup and submission notes are in the [release checklist](https://github.com/smcnab1/cheatsheets-remastered/blob/main/RELEASE_CHECKLIST.md); shipped changes are in the [changelog](CHANGELOG.md).

The extension is [MIT licensed](LICENSE). Bundled DevHints references are by Rico Sta. Cruz and contributors; see [attribution and licensing notes](ATTRIBUTION.md).
