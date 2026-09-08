# CodexRunway Reset Tracker (Raycast Extension)

A small local Raycast extension that reads the public, unauthenticated
CodexRunway API (`https://www.codexrunway.com/openapi/v1`) and shows the
latest usage-reset schedule/completion status.

It ships three commands:

- **Reset Status (Menu Bar)** — lives in your macOS menu bar, shows a short
  status (e.g. "Reset today · 4h ago" / "No reset today") and
  auto-refreshes every 10 minutes. Click it for details and a manual
  refresh / "open source post" action.
- **View Latest Reset** — a full-detail view of the newest record (metadata
  panel + the original announcement text), with an action to copy the raw
  JSON.
- **Browse Reset History** — a paginated, filterable (all / scheduled /
  completed) list of past records.

The API requires no API key and is rate-limited to 20 requests/hour, so the
menu bar command is set to refresh every 10 minutes (well under the limit)
rather than continuously polling.

## Requirements

- macOS with the [Raycast](https://www.raycast.com/) app installed
- [Node.js](https://nodejs.org/) 20+ and npm

## Install (local/private extension)

Raycast doesn't let you "drag in" a prebuilt extension — private/local
extensions are installed by running them once in dev mode, after which
Raycast keeps them installed and running in the background.

1. Unzip this folder somewhere permanent, e.g. `~/raycast-extensions/codexrunway-reset-tracker`.
2. Open Terminal and run:

   ```bash
   cd ~/raycast-extensions/codexrunway-reset-tracker
   npm install
   npm run dev
   ```

3. `npm run dev` builds the extension and registers it with Raycast — you
   should see it pop up in Raycast's root search. You can stop the `dev`
   process afterwards (Ctrl+C); the extension (including the menu bar
   command) stays installed. Re-run `npm run dev` any time you edit the
   code, or after restarting your Mac if the menu bar item doesn't
   reappear.
4. In Raycast, search for **"Reset Status"** and press Enter once — this
   pins the menu bar command so it starts automatically going forward
   (Raycast menu bar commands need to be "activated" once). You can also
   manage this under Raycast → Extensions → CodexRunway Reset Tracker →
   enable "Menu Bar" if it's not already on.

## Note on `npm run lint`

Running the linter (`ray lint`) will show one error about the `author`
field in `package.json` not being a recognized Raycast Store username —
that check only matters if you publish to the public Raycast Store. It's
safe to ignore for a private/local extension; feel free to change
`"author"` to your own Raycast username if you ever do want to publish it.

## Customizing

- Change the refresh cadence by editing `"interval": "10m"` for the
  `menubar` command in `package.json` (format like `30s`, `5m`, `1h`).
- All API logic lives in `src/api.ts` — the base URL, query-param builders,
  and the `statusLabel()`/`formatDate()`/`resetTodayAt()` helpers used across all three
  commands.
- To add authentication or a different kind filter default, adjust
  `latestUrl()` / `recordsUrl()` in `src/api.ts`.

## Notes on the API

- `GET /records/latest?kind=all|reset_scheduled|reset_completed`
- `GET /records?kind=...&page=1&pageSize=10` (`pageSize` max 10)
- No auth header needed; rate limit is 20 requests/hour with
  `X-RateLimit-*` response headers and a `429` + `Retry-After` when
  exceeded.
