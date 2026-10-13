# AGENTS.md

Guidelines for coding agents working in this repository.

## Project structure

- `src/`: the Raycast extension (TypeScript, React). Every command entry point is `src/<command-name>.ts(x)` and must match a `name` in `package.json` `commands`.
  - `src/lib/native.ts`: typed wrappers around the Swift functions (`import ... from "swift:../../swift"`).
  - `src/lib/recording.ts`: picks a target, starts the recorder, keeps its pid in `LocalStorage`, and stops it with SIGINT.
  - `src/lib/encode.ts`: encoder choice (gifski, ffmpeg or built-in), ffmpeg and gifski encoding, and the fit-under-10-MB ladder.
  - `src/lib/capture.ts`: turns a recording into a capture, re-encodes it and copies it to the clipboard.
  - `src/lib/history.ts`: the capture history in `LocalStorage`. It keeps the source videos of the latest 20 captures.
  - `src/components/`: the preview (`CaptureDetail`), shared actions (`CaptureActions`) and the trim form (`EditForm`).
- `swift/`: a Swift package built with [extensions-swift-tools](https://github.com/raycast/extensions-swift-tools). `ray build` and `ray develop` compile it; there must be no `main.swift` or `@main`.
  - `Sources/GifCapHelper/Exports.swift`: the `@raycast` functions TypeScript calls: `pickTarget`, `screenUnderMouse`, `startRecording` and `runRecorder`.
  - `Sources/GifCapHelper/Encoder.swift`: `probeMedia` and `encodeGif`, the built-in encoder on AVFoundation and ImageIO.
  - `Sources/GifCapHelper/Picker.swift`: the region and window picker overlay.
  - `Sources/GifCapHelper/Recorder.swift`: the countdown, `screencapture -v`, the recording frame and the Stop pill.
  - `Sources/GifCapHelper/Geometry.swift`: coordinate conversion, the window list and the overlay window factory.
- `scripts/demo/`: the README demo. `scene.html` and `timeline.js` recreate the UI, `render.mjs` renders it in headless Chrome to `media/demo.gif` (`npm run demo`). Update the scene when you change visible UI strings or layout.
- `scripts/screenshots/run.mjs`: regenerates the Store screenshots in `metadata/` (`npm run screenshots`, see below).
- `scripts/ci/raycast-env.d.ts`: stand-in for the Swift typings `ray build` generates, used by CI on Linux. Update it when an exported Swift signature changes.
- `assets/`: `icon.png`, rendered by `scripts/icon.swift`.
- `media/`: images the README links to (Raycast Store convention).

## How the pieces talk

Raycast runs one helper process per Swift call: argument 1 is the function name, the rest are JSON-encoded arguments, and the JSON result is read from stdout.

1. A record command calls `pickTarget("region" | "window")` (or `screenUnderMouse()`). It returns `{ kind, rect, id }`, with the rect in global top-left points, or `null` when the user pressed Escape.
2. `startRecording(request)` relaunches the helper as `runRecorder` in a new session (`posix_spawn` with `POSIX_SPAWN_SETSID`) and returns its pid at once. The command stores the pid.
3. The recorder stops on its Stop button, SIGINT/SIGTERM or the max duration, then opens the `preview` command deeplink with `{ moviePath, createdAt }` as launch context. It exits with 0 when saved, 2 when cancelled during the countdown, and 3 when there is no video.
4. `preview` encodes the GIF, saves the capture to history and copies it.

Keep `RecordingRequest`, `PickResult`, `EncodeRequest` and `MediaInfo` in sync between `Exports.swift`/`Encoder.swift` and `src/lib/native.ts`.

## Commands

- `npm install`: install dependencies.
- `npm run dev`: `ray develop`, which also compiles `swift/`.
- `npm run build`: `ray build`, the same build the Raycast Store runs.
- `npm run publish`: opens the Raycast Store pull request (needs the maintainer's Raycast and GitHub login).
- `npm run lint` / `npm run fix-lint`: `ray lint`, which includes ESLint, Prettier and manifest validation.
- `npm run check`: typecheck, ESLint, Prettier and the ASCII check. This is what CI runs.

`ray lint` reports the `author` field as invalid until it is set to a real Raycast Store handle. Every other finding should be fixed.

## Coding style

- TypeScript strict mode. Prettier with print width 120 and double quotes.
- Raycast's lint rules apply: Title Case action titles, common shortcuts from `Keyboard.Shortcut.Common` where one exists.
- Plain ASCII in code, comments, UI strings and docs: `...` instead of an ellipsis character, straight quotes, no emoji.
- Swift: system frameworks only, besides Raycast's swift tools. Any overlay window must use `makeOverlayWindow` or `overlaySharing`, so it stays out of recordings. The package builds in Swift 5 language mode.
- Building Swift needs full Xcode (`xcodebuild`). If `xcode-select -p` points at the Command Line Tools, run npm commands with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`.

## Testing

There is no unit test runner. Before calling a change done:

1. Run `npm run check` and `npm run lint`.
2. Run `npm run build` after Swift changes.
3. Smoke-test in Raycast with `npm run dev`: record a region, a window and a screen, stop the recording, and use the preview actions you touched.

You can call the Swift functions without Raycast through the binary `ray build` leaves behind:

```bash
B=swift/.raycast-swift-build/Build/Products/release/GifCapHelper
GIFCAP_SHOW_UI=1 $B pickTarget '"region"'      # overlay visible to screenshots
$B probeMedia '"/tmp/t.mov"'
$B encodeGif '{"input":"/tmp/t.mov","output":"/tmp/t.gif","fps":15,"maxWidth":1000,"start":0,"end":null}'
$B startRecording '{"rect":"100,100,600,400","windowId":null,"output":"/tmp/t.mov","countdown":0,"maxSeconds":3,"showClicks":false,"showCursor":false,"doneURL":""}'
```

With more than one display, `screencapture -x a.png b.png` writes one file per display.

## Store screenshots

`npm run screenshots` rebuilds `metadata/simple-gif-cap-{1,2,3}.png` from the real extension: the preview, Recent GIFs and the Trim and Adjust form. Run it after any change to those views. It feeds clips rendered from the demo scene through the preview command, so no real screen content gets in, and it moves your own captures aside while it runs and restores them afterwards.

Before running it:

1. Install the current build: `npm run dev` (it can keep running).
2. Confirm the deeplink prompt once with Always Run Command, for both Show Last GIF and Recent GIFs. The script stops with a timeout if Raycast is waiting on that prompt.
3. Grant the terminal Screen Recording and Accessibility access, since it captures the Raycast window and sends key presses.
4. Leave the Mac alone for about a minute. Raycast closes when focus moves, and typing lands in its search bar.

GIFs are expected in `~/Downloads`; set `GIFCAP_OUTPUT_DIR` if you changed the "Save GIFs To" preference. To change what is shown, edit `CLIPS` and `SHOTS` at the top of the script. The Store's `metadata-images` check requires the same background on every screenshot and about 12% padding, so keep the solid canvas. `npm run screenshots -- --compose-only` rebuilds `metadata/` from the last run's raw captures without touching Raycast.

## CI

`.forgejo/workflows/ci.yml` runs `npm run check` on Codeberg's Linux runners for pushes to `main` and for pull requests, with `scripts/ci/raycast-env.d.ts` standing in for the generated Swift typings. Linux cannot build the Swift package or run `ray build`, so run `npm run build` locally before pushing.

## Commits and pull requests

- Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`.
- Add user-visible changes to `CHANGELOG.md` under a new `## [Title] - {PR_MERGE_DATE}` heading, the format the Raycast Store expects.
- Include a screenshot or GIF in pull requests that change UI.
