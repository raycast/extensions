# Notaday

Manage your Notaday workspace directly from Raycast.

This extension helps you find open entries, create new tasks or routines, and maintain the tags and channels you use to organize your work.

## Commands

- **Search Entries**: Browse and search open Notaday tasks and routines. Open an entry to edit its title, description, type, due date, channel, and tags.
- **Create Entry**: Add a new task or routine with an optional description, due date, channel, and tags.
- **Manage Tags**: Create, edit, archive, and delete tags.
- **Manage Channels**: Create, edit, archive, and delete channels.

## Setup

The extension requires a Notaday API token.

1. Open the extension preferences in Raycast.
2. Paste your Notaday API token into the **API Token** preference.
3. Run one of the Notaday commands.

If the token is missing or rejected by the API, the extension will show an error state with an action to reopen the preferences.

## Notes

- Only open entries are shown in **Search Entries**.
- Journal entries are not editable from the search command.
- Changes are sent to the Notaday API using your configured bearer token.
