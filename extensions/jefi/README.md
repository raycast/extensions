# Jefi

Search mail, see today's meetings, and start mail, events and notes in [Jefi](https://jefi.app), the
native macOS mail app with calendar and notes. The same extension runs in
[Raycast](https://raycast.com) and in [Tinycast](https://github.com/abue-ammar/tinycast).

## Requirements

[Jefi](https://jefi.app) **0.7.1 or later**, which ships the command line this extension reads
through, with at least one account added.

The extension reads through Jefi's own command line (`Jefi cli <command> --json`, read-only) and acts
by opening `jefi://` links, so anything that writes (a draft, an event, a note) opens in Jefi for you
to check and save. Nothing is sent from the extension and nothing leaves your Mac.

## Commands

| Command | What it does | Keys |
| --- | --- | --- |
| Search Mail | Searches mail with Jefi's search syntax | ↵ open in Jefi · ⌘C copy subject · ⌘⇧C copy sender · ⌘⇧R reply |
| Inbox | The inbox, unread first | ↵ open · ⌘C copy subject · ⌘R reload |
| Today | Today's events and invitations awaiting a reply | ↵ open · ⌘J join meeting · ⌘C copy title · ⌘⇧C copy meeting link |
| Compose Email | A form that opens a prefilled draft in Jefi | ⌘↵ open in Jefi |
| Quick Add Event | "Lunch with Nora Friday 1pm" → Jefi's event editor, prefilled | |
| Create Note | A form that opens a prefilled note in Jefi | ⌘↵ open in Jefi |
| Search Notes | Recent notes, or notes matching the query | ↵ open · ⌘C copy title · ⌘N create note |
| Unread Mail | Menu bar: unread count and your next event, refreshed every 2 minutes | |

## Preferences

| Preference | Default | What it's for |
| --- | --- | --- |
| Jefi Executable | `/Applications/Jefi.app/Contents/MacOS/Jefi` | Where Jefi lives. Change it if you keep Jefi elsewhere, e.g. `~/Applications/Jefi.app/Contents/MacOS/Jefi`. |

## Tinycast

In Tinycast, **Settings → Extensions → Registries**, add the GitHub repository
`algolab-cloud/jefi-extensions`, then search the registries for "Jefi". For **Unread Mail**, turn on
**Show in menu bar** in the command's settings (Tinycast never starts menu-bar commands on its own).

To install a local build instead, run `npm install && npm run build`, then **Settings → Extensions →
Install New → Add Folder…** and pick `dist/`.

## Development

```sh
npm install
npm run dev        # ray develop: builds, loads it into Raycast, rebuilds on save
npm test           # vitest: the client against the fake CLI, link building, formatters
npm run lint       # ray lint
npm run build      # distribution build into dist/
```

`fixtures/fake-jefi.mjs` answers every CLI command with made-up sample data, so you can work without
Jefi installed. Point **Jefi Executable** at it (or set `JEFI_CLI` for tests); it needs `node` on the
PATH the launcher sees. `FAKE_JEFI_EMPTY=1` returns empty results and `FAKE_JEFI_ERROR="message"`
makes every command fail the way the real CLI does.

Store screenshots still need taking; `metadata/README.md` lists them.
