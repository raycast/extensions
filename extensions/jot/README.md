# Jot

Search, add, and finish jots from Raycast.

[Jot](https://sayjot.xyz/?ref=raycast) is a quick capture app for Mac. Each jot is a Markdown file in a vault folder (by default `~/Documents/Jot`).

**This extension needs the Jot app.** Jot is a paid app. The extension talks to the `jot` CLI that ships inside Jot, so Jot must be installed. Jot does not need to be running.

## Commands

**Search Jots**: your jots, grouped by Today, Yesterday, This Week and Earlier. Filter by section or tag from the dropdown. Pinned jots and sections show on each row.

- A preview pane shows the jot's Markdown, rendered, with its tags and date (⌘⇧P to hide or show).
- Filter by Open, Open and Done, or any tag from the dropdown. Tags keep the same color everywhere.
- ⏎ copies the text. ⌘O opens the file, ⌘D marks it done (with Undo in the toast), ⌘T adds tags, ⌘⇧A archives, ⌘N writes a new jot.
- Nothing matches your search? Press ⏎ to save the search text as a new jot.

**Add Jot**: a Markdown form with a section (Inbox, any existing section, or a new one) and tags. With Jot 2.0.1 or later you can also attach images (pick files, or the image on your clipboard) and pin the jot. ⌘⏎ saves, ⌘⇧⏎ saves and clears the form for the next one. Unsent text is kept as a draft.

**Voice Note, Quick Draw, Annotate Screen, Quick Note**: open Jot's own capture windows from Raycast. They press the shortcuts you set in Jot, so rebinding them in Jot still works. Raycast needs Accessibility access for this.

**Quick Jot**: type straight into the Raycast bar. End with `#tags` to tag it, for example `call the dentist #home`.

## Setup

The extension looks for the CLI in this order:

1. The **Jot CLI** path in the extension preferences, if set.
2. `/usr/local/bin/jot`
3. `/Applications/Jot.app/Contents/Helpers/jot`

If Jot is somewhere else, set the **Jot CLI** preference to `Jot.app/Contents/Helpers/jot` inside your copy of the app.

The extension uses the vault from Jot settings. To use another folder, set the **Vault Folder** preference.

## Notes

- Archive keeps the file in the vault. It only hides the jot from the inbox.
- Search matches jot text, tags, and the source app or URL, like `jot search`.
- Search Jots shows up to 200 jots.
