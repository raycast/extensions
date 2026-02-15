# Troubleshooting

## `npm run dev` fails with Raycast CLI errors

Symptom example:

- `TypeError: Cannot read properties of undefined (reading 'map')` during `ray develop`.

What to do:

1. Confirm `package.json` command entries and preferences are valid JSON.
2. Run a clean build:
   ```bash
   npm run build
   ```
3. If needed, reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
4. Retry:
   ```bash
   npm run dev
   ```

## Quick append says clipboard offset error

Current intended behavior:

- Quick append always uses clipboard offset `0` (latest item).

If you still see offset errors:

1. Copy fresh plain text to clipboard.
2. Retry quick append.
3. If clipboard item is an image/file entry, it is intentionally rejected.

## Clipboard history shows image-like entries

The extension filters non-text clipboard entries, including common image placeholder text.
If no valid text items exist, history can appear empty. Copy plain text and refresh.

## "No matching files" in picker

Check:

1. `roots` includes the directory containing target files.
2. `allowedExtensions` includes target extension (must start with `.` or will be normalized).
3. `searchExcludes` is not excluding your target path.
4. `searchMaxDepth` is high enough.

Then run "Refresh Files" action in picker.

## Append blocked by extension filter

Message:

- `Blocked by extension filter: '<path>' is not in your allowed extensions...`

Fix:

Update `allowedExtensions` in Extension Preferences, for example:

- `.txt,.md,.markdown`
- `.txt,.md,.markdown,.yaml,.yml`

## File appears corrupted after append

The extension preserves UTF-8/UTF-16 encodings and uses atomic writes.
If corruption happened outside current versions:

1. Verify current extension version and rebuild:
   ```bash
   npm run build
   ```
2. Test on a copy of the file.
3. Use `Undo Last Append` if available and file has not changed after append.

## Undo Last Append fails

Possible causes:

- No append record exists yet.
- File changed after append (undo is blocked for safety).
- Backup snapshot missing.

Recommended path:

1. Stop further edits to that file.
2. Use regular version control or backups for manual restore if undo is blocked.

## Build fails due Raycast config path permissions

If build output mentions permission issues under `~/.config/raycast/extensions`:

- Run commands in an environment with access to your Raycast config directory.
- In restricted/sandboxed tooling, grant elevated permission for `npm run build`.

## Lint fails due network/schema lookup

`ray lint` may validate author/schema via network.
In restricted network environments, lint can fail even if code is correct.
Use `npm test` and `npm run build` as primary local checks.

If lint reports invalid author:

- Set `author` in `package.json` to your actual Raycast username.
