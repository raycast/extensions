<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="paste.rs" width="100"/>
    <h3>paste.rs</h3>
    <p>Create quick anonymous paste.rs links from typed, selected, or clipboard text</p>
    <br/>
    <br/>
</div>

Create quick anonymous [paste.rs](https://paste.rs) links from typed, selected, or clipboard text.

paste.rs is intentionally minimal: anonymous, no API key, no account. This extension keeps that spirit — upload text, get a URL back on your clipboard.

## Commands

- **Create Paste** — Enter content, choose a language, and submit to copy the paste URL. The language starts from your Default Language preference.
- **Create Paste from Clipboard** — Upload whatever text is on your clipboard and copy the resulting URL.
- **Paste Selected Text** — Read selected text from the frontmost app, confirm the public upload, and copy the resulting URL. Empty or unavailable selections show an error; canceling uploads nothing.
- **Browse Recent Pastes** — Browse pastes you created with Raycast. Copy the URL or the original content back, open the paste in your browser, delete a paste on paste.rs, or just remove it from your local history.

## Notes

- Pastes are anonymous and public. Don't paste secrets.
- paste.rs enforces a maximum upload size. If your content exceeds it, only part is stored and you'll be warned that the paste was partially uploaded (`206 Partial Content`).
- **Browse Recent Pastes** history is stored locally on your machine (the last 50 pastes). paste.rs has no listing endpoint, so the history only reflects pastes made through Raycast.
- **Delete Paste** issues a `DELETE` to paste.rs and removes the entry from history. **Clear History** only clears the local list and leaves the pastes on paste.rs.

## Language and URLs

Set **Default Language** in extension preferences for clipboard, selected-text, and AI pastes. **Create Paste** lets you override it per paste, including choosing Plain Text. Plain Text is the default and copies the original `https://paste.rs/<id>` URL. A language appends the service-supported extension, such as `https://paste.rs/<id>.rs` for Rust or `.py` for Python. Markdown (`.md`) renders as HTML rather than a code block.

The language menu is a curated subset of the extensions advertised by the [paste.rs web form](https://paste.rs/web), verified on 2026-10-12. Unsupported extensions such as `.ts` and `.swift` are not offered. See the [service API](https://paste.rs/) and [service source](https://github.com/SergioBenitez/rktpb/blob/master/src/main.rs) for rendering behavior. Adding or removing the language suffix changes how the same paste is displayed; deleting either URL deletes the underlying paste.

The exact returned URL, including its selected language suffix, is copied and saved in history. Invalid service URLs and failed uploads do not replace the clipboard. Partial uploads copy the URL with a warning. Successful uploads are saved to history before copying the URL. If copying fails, the paste remains in history when storage is available, and the error includes its URL for recovery. If local history cannot be saved, the command reports that the URL was copied but history is unavailable. Network requests time out after 30 seconds.

## Development checks

Run `npm ci`, `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Tests use synthetic fixtures and mocked fetch, selection, clipboard, confirmation, and history APIs; they do not upload anything or access real user text. Runtime checks of selection availability and confirmation still require Raycast on each supported platform.
