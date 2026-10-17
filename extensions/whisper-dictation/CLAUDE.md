# CLAUDE.md

Guidance for working in this repo.

## What this is

`whisper-dictation` — a Raycast extension for local speech-to-text using Whisper, with
optional AI refinement of the transcript. TypeScript + React (`react-jsx`), strict mode,
target ES2023. UI is built with `@raycast/api`.

## Commands

```bash
npm run dev        # ray develop — live-reload extension in Raycast (long-running)
npm run build      # ray build — production build
npm run lint       # ray lint — eslint + prettier check
npm run fix-lint   # ray lint --fix — auto-fix lint/format issues
```

Type-check with `npx tsc --noEmit`. There is no test suite. Publishing is `npm run publish`
(Raycast Store) — never `npm publish`.

## Layout

- `src/*.tsx` — one file per Raycast command. The commands (from `package.json`):
  - `dictate-simple` → "Dictate"
  - `dictate` → "Dictate with AI"
  - `dictate-with-prompt` → "Dictate with AI Prompt"
  - `download-model` → "Download Whisper Model"
  - `dictation-history` → "Dictation History"
  - `configure-ai` → "Configure AI Refinement"
- `src/hooks/` — shared logic as React hooks: `useRecording`, `useTranscription`,
  `useAIRefinement`, `useConfiguration`. Prefer extending these over duplicating logic in commands.
- `raycast/` — standalone shell/python script commands; not part of the TS build.
- `assets/`, `metadata/` — Raycast store assets and screenshots.

## How it works

- Audio is recorded via `sox` (`soxExecutablePath` preference), transcribed by a local
  whisper binary (`whisperExecutable` + `modelPath` preferences) invoked through
  `child_process`.
- AI refinement is optional (`aiRefinementMethod`) and can use Raycast AI or a local/remote
  Ollama endpoint (`ollamaEndpoint`, `ollamaModel`, etc.).
- User-configurable settings live under `preferences` in `package.json` — add new options
  there, then read them via `getPreferenceValues`.

## Conventions

- A `PostToolUse` hook runs Prettier on every edited file, so don't hand-format — let it.
- Keep new commands consistent with the existing one-file-per-command pattern and register
  them in `package.json`'s `commands` array.
- Run `npm run lint` before considering a change done.
- See `CHANGELOG.md` for the contribution/version history.

```

```
