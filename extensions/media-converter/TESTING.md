# Testing the Media Converter extension

This extension has three automated test layers plus a manual UI checklist you
should walk through before shipping a release that touches the converter,
merge, history, or presets code paths.

## 1. Unit tests

Fast, headless, no FFmpeg required. Covers pure helpers: time parsing,
byte-size formatting, FFmpeg stderr/stdout parsers, merge stream-info logic,
and built-in preset validation.

```bash
npm test
```

All unit tests live under `test/unit/*.test.ts` and run via Node's built-in
test runner plus `tsx`. `@raycast/api` is stubbed via `test/register.mjs`
(which redirects both ESM and CJS resolutions to `test/stubs/raycast-api.js`),
so the tests can import real source files that transitively depend on Raycast
runtime APIs.

## 2. FFmpeg smoke test

Generates tiny fixtures with FFmpeg itself (via `testsrc`, `sine`, `color`
filters — no binary fixtures checked into the repo), then exercises the real
`convertMedia` and `mergeMedia` code paths end-to-end.

```bash
npm run test:smoke
```

What it covers:

- `.mp4 -> .webm` (libvpx-vp9 + opus with CRF)
- `.mp4 -> .gif` (palettegen / paletteuse pipeline)
- `.mp4` conversion with trim (`-ss` / `-to`)
- `.mp4` conversion with `stripMetadata` (verifies metadata is gone)
- `.wav -> .mp3`
- `.png -> .jpg`
- Merge two compatible `.mp4` files via stream-copy (fastest path)
- Merge two `.mp4` files with `forceReencode` (concat filter with video+audio)
- Merge two `.wav` files into `.mp3` via concat filter (audio-only path)
- Video conversion emits at least one progress callback

Requires FFmpeg ≥ 6 on PATH (Homebrew’s `/opt/homebrew/bin/ffmpeg` is picked
up automatically).

## 3. AI tool evals

Lightweight natural-language regression suite for the Raycast AI tools. Run
via the Raycast CLI:

```bash
npx ray evals
```

Evals live under `package.json` → `ai.evals` and cover:

- `convert-media` with simple prompts, presets, trim, strip-metadata, and
  GIF-specific parameters (`gifFps`, `gifWidth`, `gifLoop`)
- `merge-media` with newline-separated input paths and the `forceReencode`
  flag

## 4. Manual UI checklist

Walk through each Raycast command with a sample file open in Finder. The
checklist is intentionally exhaustive — it takes ~15 minutes end to end and
is the surest way to catch regressions the automated layers can't see
(Raycast forms, toasts, navigation, file pickers).

### Convert Media — images

- [ ] Opens with selected Finder image prefilled
- [ ] Output format dropdown only shows image + `.gif` options for animated PNGs? (no — images have image-only outputs)
- [ ] Change JPG quality slider — preview updates, submit produces a file next to the input
- [ ] WebP lossless variant is selectable and produces a visibly identical file
- [ ] HEIC → JPG works on macOS (uses `sips`, falls back gracefully on Windows with a clear toast)
- [ ] PNG with "strip metadata" enabled removes EXIF (verify with `exiftool` or similar)
- [ ] Custom output location override (pick a different folder) writes there
- [ ] Success toast shows the before/after size delta

### Convert Media — audio

- [ ] `.wav → .mp3` with VBR on produces a smaller file than CBR
- [ ] `.mp3 → .m4a` works (`-c:a aac`)
- [ ] `.flac → .wav` produces a larger file (lossless blow-up)
- [ ] Trim start/end fields accept `1:30`, `90`, `00:01:30.500` — invalid input shows an inline validation error
- [ ] Trimming an audio file produces the expected duration (±0.2s)

### Convert Media — video

- [ ] `.mov → .mp4` re-encodes with progress toast updating (percent + ETA)
- [ ] `.mp4 → .webm` shows progress and produces a smaller file at same quality
- [ ] `.mp4 → .mkv` with HEVC (`libx265`) works
- [ ] `.mp4 → .gif` with fps=15/width=720/loop=on produces a looping GIF
- [ ] Trim 0:01..0:05 produces a 4-second output (probe with `ffmpeg -i`)
- [ ] "Strip metadata" strips title/comment/creation-time
- [ ] Progress toast stays responsive (no UI freeze) for a 30s+ input

### Convert Media — presets

- [ ] Preset dropdown lists all built-in presets and any user presets
- [ ] Picking a preset fills outputFormat + quality + trim + stripMetadata
- [ ] "Save as preset…" form appears, persists under `LocalStorage`, and re-appears on reopen
- [ ] Deleting a user preset from the Manage Presets command removes it here next open

### Merge Media

- [ ] Launched via command: file picker shows selected Finder files prefilled
- [ ] Adding a 2nd, 3rd, 4th file works via the picker
- [ ] `Cmd+Up` / `Cmd+Down` shortcuts rotate the file order
- [ ] Merging 2 compatible `.mp4`s reports "stream-copy" strategy (fast, no re-encode) in the toast
- [ ] Merging files with different resolution/codec automatically falls back to re-encode
- [ ] `forceReencode` checkbox forces the slow path
- [ ] Custom output filename is honoured (no double extension)
- [ ] Merging 3 audio files (`.wav` + `.mp3` + `.m4a`) into `.mp3` works
- [ ] Strip metadata option applies to the merged output

### View Conversion History

- [ ] Runs after at least one conversion is logged
- [ ] Entries are grouped by date (Today / Yesterday / older)
- [ ] Selecting an entry shows size delta, format, duration
- [ ] "Open" action launches the file with the default app
- [ ] "Show in Finder" reveals the output file
- [ ] "Re-run" opens the convert form pre-filled with the entry's inputs
- [ ] "Copy FFmpeg Command" copies a shell-runnable command
- [ ] "Remove" deletes a single entry; list refreshes
- [ ] "Clear All" requires confirmation and empties the list

### Manage Presets

- [ ] Built-in presets are listed with a badge indicating they're built-in
- [ ] User presets appear in a separate section
- [ ] "Duplicate" a built-in preset produces a user-editable copy
- [ ] "Edit" a user preset updates it in LocalStorage
- [ ] "Delete" a user preset removes it; built-in presets can't be deleted
- [ ] Newly created preset immediately appears in the Convert form's preset dropdown

### AI tools (from the Raycast AI side panel)

- [ ] `Convert this image to webp` prompt succeeds on a selected image
- [ ] `Convert this video using the Email-friendly preset` applies the preset
- [ ] `Make this into a 15fps 720p GIF` maps to `.gif` with matching params
- [ ] `Merge these files into merged.mp4` with multiple selected files succeeds
- [ ] Merging audio-only selection produces an audio file (no "Invalid filtergraph" error)
- [ ] Trim + strip-metadata prompts round-trip correctly

## 5. Before shipping a release

- [ ] `npm test` — green
- [ ] `npm run test:smoke` — green
- [ ] `npx ray build` — green (no type errors)
- [ ] `npx ray lint` — no warnings or errors
- [ ] Manual checklist above walked end-to-end on a real file in Raycast

If any automated layer is red, treat it as a blocker; the bugs they catch
(codec arg shapes, filter graph mismatches, timestamp rounding) are the
exact class of regressions users will hit first.
