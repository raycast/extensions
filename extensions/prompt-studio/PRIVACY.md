# Privacy

Prompt Studio's initial Raycast Store release is local-only.

## Data it handles

- Prompts are stored as readable Markdown files in the folder you choose.
- The extension reads and writes those prompt files when you browse, create,
  edit, duplicate, archive, restore, or delete a prompt.
- Paste and copy actions use Raycast's clipboard and paste APIs.
- Usage ranking, when available, is stored in a rebuildable local SQLite file.

SQLite is a local database file. "Rebuildable" means it can be deleted and
re-created from the Markdown library without losing the prompts themselves.

## Network access

The commands included in the initial Store release do not send prompts,
clipboard contents, usage history, or prompt files to Prompt Studio servers or
third-party services. Prompt Studio does not include advertising, external
analytics, or tracking.

Raycast itself is a separate product with its own privacy practices.

## Advanced source-tree features

The repository contains experimental enhancement and research features that are
not included as commands in the initial Store release. Those features stay
disabled on a fresh installation and require an explicit setup and review step
before any external request.

## Removing local data

Delete the configured prompt folder to remove prompt files. Local indexes and
feature state live under Raycast's extension support directory and can be
removed by uninstalling the extension or clearing its data in Raycast.
