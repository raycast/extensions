# Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Manage macOS Text Replacements from Raycast.
- Create, edit, clone, delete, import, and export text replacements.
- Split creation, import, export, tag color setup, and opening macOS settings into dedicated Raycast commands.
- Add selection mode for assigning a tag to multiple replacements at once.
- Merge tags into an existing replacement when creating the same trigger and replacement text again.
- Sync macOS Text Replacements through the KeyboardServices database and refresh text input services so newly created entries persist more reliably. You may need to close System Settings and restart any text input sessions (e.g. Notes, Messages) to see edits.
- Keep only the 10 most recent KeyboardServices database backup sets to limit local disk usage.
- Add searchable tags and preset, named, RGB, or 3/6-digit hex tag colors stored locally in Raycast support storage.
- Preserve tag colors when importing and exporting Text Replacement JSON.
