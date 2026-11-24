<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="Litterbox" width="100"/>
    <h3>Litterbox</h3>
    <p>Upload files to Litterbox from Raycast with a file picker or Finder selection (macOS), set expiry (1h, 12h, 24h, or 72h), and get shareable links. Recent uploads are listed until they expire.</p>
    <br/>
    <br/>
</div>

Upload files to [Litterbox](https://litterbox.catbox.moe/) and share temporary links with a 1-hour, 12-hour, 24-hour, or 72-hour expiry.

## Commands

- **Upload to Litterbox**: choose one or more files with the file picker, select an expiry, then choose Upload.
- **Upload Selected Finder Files** (macOS): select files in Finder and run the command. Review or edit the selection and expiry in the form, then choose Upload. Closing the form before submitting uploads nothing. If Finder is unavailable or nothing is selected, select files in Finder and run the command again.
- **View Recent Uploads**: copy or open links until they expire. Remove from List and Clear All Recent Uploads only remove local history. Clear All requires confirmation; it does not delete hosted files.

## Upload limits and batches

[Litterbox advertises a 1 GB limit](https://litterbox.catbox.moe/). The extension conservatively treats this as **1,000,000,000 bytes per file**. It checks all selected files before uploading anything, rejecting unreadable files, folders and other non-regular files, and the [prohibited file types](https://litterbox.catbox.moe/faq.php): `.exe`, `.scr`, `.cpl`, `.doc*`, and `.jar` (case-insensitive). Files are checked again immediately before each upload.

Uploads are anonymous and happen one file at a time using the [Litterbox API](https://litterbox.catbox.moe/tools.php). If the service or network fails partway through, the batch stops and the toast reports how many files uploaded and which file failed. Successful URLs are saved in recent uploads and copied together; a clipboard failure still preserves history. Already uploaded files cannot be rolled back through this API and remain hosted until expiry. Successful files are removed from the current form selection after a partial failure, preserving any additions or removals made during upload. Submitting again uploads only the remaining selection.

## Development

Run `npm ci`, `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Regression tests mock Finder, the clipboard, local history, and network uploads; they never read real Finder selections or upload user files.
