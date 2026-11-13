# Calendar Availability Image

Raycast command that renders a week view of your free time slots from a published ICS calendar, without event titles, and copies it to the clipboard.

## Setup

Requirements: Raycast and Node.js 22.22 or later.

```bash
npm install
npm run dev
```

`npm run dev` registers the extension in Raycast. It stays there even after you stop the process.

The first time you run **Copy Calendar Availability Image**, Raycast asks for the ICS link. Any published ICS calendar link works, for example:

- **Outlook on the web:** Settings → Calendar → Shared calendars → Publish a calendar, next to the HTML link.
- **Google Calendar:** Settings → your calendar → Integrate calendar → Secret address in iCal format.

Whether an event counts as busy, tentative or free is read from Outlook's busy status where present, otherwise from the standard `STATUS` and `TRANSP` fields.

You can assign a hotkey in Raycast under Settings → Extensions → Calendar Availability Image.

## Preferences

| Preference | Default |
|---|---|
| Time Range | 2 weeks, starting with the current week |
| Workday Start / Workday End | 8 / 18 |
| Shortest Free Slot | 30 minutes |
| Tentative Events: Treat as busy | on |
| Weekend: Show Saturday and Sunday | off |
| Image Language | English |

## Behavior

- Only start, end and busy status are read. Titles never end up in the image.
- Events marked as "free" or "working elsewhere" do not block time.
- All-day events only block the day if they are marked as busy or out of office.
- Elapsed time on the current day is grayed out; free slots start at the next quarter hour at the earliest.
- Times are shown in the time zone of your Mac.
- The most recent image is also saved as `availability.png` in the extension's support folder.

## Tests

```bash
npm test
```

Runs the unit tests for the calendar logic in `test/*.test.ts` with Node's built-in test runner. The tests run in the `Europe/Berlin` time zone so that the daylight saving cases are reproducible.

## Manual Run Without Raycast

```bash
npx esbuild test/run.ts --bundle --platform=node --outfile=.tmp/run.js
node .tmp/run.js test/sample.ics .tmp/out.png 2026-11-10T10:20:00+01:00 de
```

## Third-Party Licenses

The extension's own code is MIT licensed. It ships with the following third-party components:

| Component | License | Source |
|---|---|---|
| [`ical.js`](https://www.npmjs.com/package/ical.js) (bundled into the build) | MPL-2.0 | [kewisch/ical.js](https://github.com/kewisch/ical.js) |
| `assets/resvg.wasm`, the unmodified `index_bg.wasm` from [`@resvg/resvg-wasm`](https://www.npmjs.com/package/@resvg/resvg-wasm) 2.6.2 | MPL-2.0 | [yisibl/resvg-js](https://github.com/yisibl/resvg-js) |
| Inter font (`assets/Inter-*.ttf`) | SIL Open Font License 1.1, see `assets/Inter-LICENSE.txt` | [rsms/inter](https://github.com/rsms/inter) |

The MPL-2.0 components are used unmodified; their source code is available at the links above under the terms of the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/).
