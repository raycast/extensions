# Pivot

Bulk-change the default macOS app for many file extensions at once.

macOS makes you change default apps one extension at a time through Get Info. Pivot does the whole batch in a single confirmation: pick the extensions, pick the app, done.

## Commands

**Pivot Apps** — Pick extensions (individually or via a saved preset), pick an app, confirm. Every selected extension is rebound to that app.

**Manage Presets** — Create, edit, rename, duplicate, or delete reusable extension groups. One preset ships built in: **Code & text** (every common source, markup, config, and shell extension).

**Undo Last Pivot** — Restore the previous default handler for every extension touched by the most recent pivot.

## Notes

- Custom extensions you add are remembered across runs.
- Undo only covers the most recent pivot — there is no longer history.
- If an extension had no prior default handler (i.e. macOS was using the system default), Undo cannot revert it: there is no Launch Services API to restore "system default." Those extensions are reported in the toast and skipped; everything else is reverted normally.
- All bindings use `kLSRolesAll` — Pivot does not distinguish editor vs viewer roles.
