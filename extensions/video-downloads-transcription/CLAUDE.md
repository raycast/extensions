# Working on this extension

A Raycast extension (macOS) that downloads subtitles, audio, video and photos with yt-dlp, and
transcribes or translates recordings locally with whisper.cpp. It must stay publishable to the
Raycast Store. Everything runs on the user's Mac; nothing is uploaded to a transcription service.

The owner's first language use case is Serbian, so language handling, favorite languages and
transcription accuracy in Serbian matter more than average.

## Rules from the owner

- **Commits:** atomic, one change per commit, simple one-line messages in plain English. Never add a
  `Co-Authored-By: Claude` trailer or any other AI attribution. Don't push or open PRs unless asked.
- **Transcription accuracy:** never change the whisper model to fix an accuracy problem. Tune VAD or
  the way audio is prepared instead. Silero VAD is the default and must stay on unless the user
  turns it off.
- **Verify, don't assume:** run the thing for real before saying it works — real links, real files,
  the real background worker. Report failures with the actual output, and say plainly what was not
  tested.
- **Ask before side effects on the owner's machine:** don't install Homebrew packages, change their
  whisper.cpp setup, or touch files outside the repo and the scratch folder without asking.
- **Answer questions in chat.** Only implement when asked to implement.

## Layout

| File                 | What it holds                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/core.ts`        | Links, yt-dlp, captions, media and photo downloads, no React                                                      |
| `src/whisper.ts`     | whisper.cpp: models, VAD, transcription and translation                                                           |
| `src/models.ts`      | Whisper model catalog, checksummed downloads, Core ML encoders                                                    |
| `src/setup.ts`       | Tool detection and Homebrew installs                                                                              |
| `src/playlists.ts`   | Playlist and channel listing and downloads                                                                        |
| `src/jobs.ts`        | Job types, the queue folder, and the background worker                                                            |
| `src/queue.tsx`      | Queue list, toasts, and the hooks other commands use                                                              |
| `src/*.tsx` commands | `download-video`, `transcribe-selected-files`, `transcription-queue`, `manage-tools-and-models`, `queue-menu-bar` |

Keep React out of the modules the worker uses (`core`, `whisper`, `models`, `setup`, `playlists`,
`jobs`), and keep pure, testable functions there rather than in components.

## The background queue

Downloads and transcriptions run in a detached Node process so they survive closing Raycast.

- The worker re-loads **the command's own bundle** and calls `runQueueWorker`, with `@raycast/api`
  and `react` stubbed as `{}`. **Every command entry must keep `export { runQueueWorker } from "./jobs";`**
  and no module it imports may touch the Raycast API at import time.
- Jobs are JSON files in `environment.supportPath/queue`, written atomically. A job's `spec` is
  persisted, so changing its shape breaks jobs that are already queued: add fields, don't rename.
- Lane limits in `jobs.ts` decide what runs at once: transcriptions one at a time, playlists one at
  a time, three single downloads, one Homebrew install.
- Progress is a short human sentence; a `NN%` in it becomes the percent shown in the UI and menu bar.

## Gotchas

- Raycast's `PATH` is minimal. Always find binaries with `executable()`, and pass `--ffmpeg-location`
  to yt-dlp.
- yt-dlp errors are translated into plain advice in `explainYtDlpError`. Add new cases there.
- Turbo whisper models cannot translate. Core ML builds need a `*-encoder.mlmodelc` next to each
  model; prebuilt ones are downloaded from Hugging Face and verified by checksum.
- Instagram photos come from yt-dlp with `--ignore-no-formats-error`; X photos come from X's public
  embed data, since yt-dlp skips them.
- Raycast preferences cannot be written by the extension. Anything the user picks in the UI goes to
  `LocalStorage` or the support folder.

## Style

- No new npm dependencies. `@raycast/api` and `react` only.
- Comments say why, not what, and are rare. Match the surrounding code.
- User-facing text: plain English, sentence case, no jargon, no exclamation marks. Say what to do
  next ("Download one in Manage Tools and Models"), not just what broke. Action titles use Raycast's
  Title Case (eslint enforces it).
- Prettier formats everything; eslint must pass with no warnings.

## Build, run and test

```sh
npm install
npm run dev     # ray develop: hot-reloads the extension in Raycast while it runs
npm run build   # ray build: verifies it compiles; also refreshes the local dev build
npm run lint    # ray lint: manifest, icons, eslint, prettier
npm test        # node --test: pure functions, bundled with esbuild
```

- `npm test` bundles `src/core.ts`, `whisper`, `models`, `setup`, `playlists` and `queueSummary`
  into one CJS file and asserts against them. Add a test for every parsing or naming rule.
- For UI, build a throwaway harness in the scratch folder: bundle a command with esbuild, alias
  `@raycast/api` to a mock that records toasts, clipboard and navigation, keep `react` external,
  and render with `react-test-renderer` inside `act`. Inspect `List.Item` props and flattened
  `ActionPanel` children. This catches wrong titles, missing actions and broken flows quickly.
- For the worker, bundle `src/jobs.ts` and call `enqueue` directly, then poll `readJobs`. Run it with
  Raycast's own Node (`~/Library/Application Support/com.raycast.macos/NodeJS/runtime/*/bin/node`)
  and `PATH=/usr/bin:/bin` to reproduce Raycast's environment.
- Test with small real links: `youtu.be/jNQXAC9IVRw` (19 s), a 4-video playlist, an X post with two
  videos, an Instagram carousel, and a photo post.

## Store checklist

`author` must be the owner's Raycast username, `license` MIT, categories in Title Case, icon 512×512,
`CHANGELOG.md` with `## [Title] - {PR_MERGE_DATE}`, and three to six 2000×1250 screenshots in
`metadata/`. `npm run lint` checks everything except the screenshots. Publish with `npm run publish`,
which opens a pull request against `raycast/extensions`.
