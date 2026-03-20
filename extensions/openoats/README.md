# OpenOats Raycast Extension

This extension targets the OpenOats deeplinks merged in [OpenOats PR #39](https://github.com/yazinsai/OpenOats/pull/39) and the current app behavior in the upstream repository.

It expects the installed app to support:

- `openoats://start`
- `openoats://stop`
- `openoats://notes`
- `openoats://notes?sessionID=<id>`

## Included commands

- `Start Recording`: starts a new OpenOats session via deeplink
- `Stop Recording`: stops the active OpenOats session via deeplink
- `Search Notes`: browses saved sessions, shows generated notes/transcripts, and opens a session in OpenOats
- `Export Transcripts`: selects one or more sessions and exports transcript text files to `~/Downloads/OpenOats Exports/Transcripts`
- `Export Notes`: selects one or more sessions and exports generated note markdown to `~/Downloads/OpenOats Exports/Notes`

## OpenOats data source

The extension reads session data directly from:

`~/Library/Application Support/OpenOats/sessions`

It uses the same `.jsonl` transcript files and `.meta.json` sidecars that the app writes.

## Local testing

1. Install the latest OpenOats build.
2. Verify the installed app includes the merged deeplink support.
3. Install the latest Raycast desktop app for macOS.
4. In this folder, run `npm install` if dependencies are not already present.
5. Run `npm run build` to validate the production build.
6. Run `npm run lint` to catch manifest and API issues.
7. Run `npm run dev` and open the extension in Raycast.
8. Test the commands against a real OpenOats install:
   - `Start Recording`
   - `Stop Recording`
   - `Search Notes`
   - `Export Transcripts`
   - `Export Notes`

## Not included

These Granola commands are intentionally omitted because the underlying product capability does not exist in OpenOats today:

- `Search People`
- `Search Companies`
- `Create Note from Transcript`
- Notion export

## Privacy

This extension only reads local OpenOats data from Application Support and opens the OpenOats app via its custom URL scheme. It does not send data to any third-party service.
