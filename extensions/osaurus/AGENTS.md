# AGENTS.md

Notes for whoever works on this extension next, human or agent. Paths are repo-relative.

## What it is

A Raycast client for [Osaurus](https://osaurus.ai), which runs MLX models on Apple Silicon and
serves an OpenAI- and Ollama-compatible API at `http://localhost:1337` (API docs:
<https://docs.osaurus.ai/api>). Four commands (`src/ask-osaurus.tsx`, `src/manage-models.tsx`,
`src/search-models.tsx`, `src/search-history.tsx`) plus a Raycast AI model provider
(`src/models.ts`, declared by `"ai": { "modelProvider": "models" }` in `package.json`).

| File | Holds |
| --- | --- |
| `src/lib/osaurus.ts` | the HTTP API, and finding, opening and quitting the Osaurus app |
| `src/lib/server-toast.ts` | starting Osaurus when it's down, and opening `osaurus://` / `huggingface://` links |
| `src/lib/huggingface.ts` | Hugging Face search and model cards |
| `src/lib/history.ts` | reading Osaurus's chat database, and the Markdown export |
| `src/hooks/use-chat.ts` | Ask's streaming chat |

## Osaurus has no API for these, so don't look for one

- **Downloading or deleting models.** Add to Osaurus opens `huggingface://?model=<repo>` in the
  Osaurus app, which shows its own download UI. The newer `osaurus://open_from_hf` link doesn't
  exist in every build. Hide Model only hides it in this extension.
- **Chat history.** `src/lib/history.ts` reads `~/.osaurus/chat-history/history.sqlite` directly,
  read-only, through the system `/usr/bin/sqlite3`. The schema is undocumented: select only the
  columns you need, and probe `pragma_table_info` before using a column a later Osaurus added
  (`pinned` and `archived` are handled this way).
- **Opening a specific chat.** There is no link for one; Open Osaurus just opens the app.

`exportMarkdown()` copies the format of Osaurus's own Markdown export, `ChatSessionExporter.markdown`
in the Osaurus repo, so a file exported here matches one exported there. Keep them in step.

## Starting and stopping Osaurus

People often have two builds installed: stable (`com.dinoki.osaurus`) and Beta
(`com.dinoki.osaurus.beta`). Every "start Osaurus" path goes through `appToStart()`, which
picks, in order: a build that's open now (the one that served last, if open), the **Osaurus
App** preference, the build that served last, then any installed build, stable first.

- **Open apps and links by app path, never by bare scheme.** macOS routes `osaurus://` to
  whichever build registered last, and a bare `osaurus://` is read as an agent-pairing link.
  `openInOsaurus()` passes the app path to `open`.
- **Don't use the `osaurus` CLI.** `osaurus serve` launches a second copy of the app, and
  `osaurus stop` stops the server but leaves the app running with no server. The only reliable
  restart is quit, then relaunch. `openOsaurus()` does that for an app that is running but not
  serving.
- A remote **Server URL** can't be started from here; the empty views only offer Try Again.

## Chat sessions

Ask sends a `session_id` so a Raycast conversation shows up as one chat in Osaurus's History.
**Each request replaces that session's stored turns with the messages it sends.** So
`useChat()` starts a new session after a stopped or failed turn, because that turn is never sent
as history and reusing the session would erase it from Osaurus's History.

## Raycast gotchas already hit here

- **The model dropdown fires `onChange` with its first item when it mounts**, ignoring `value`.
  Ask lists the model it opens on first, so that call picks the same model. Remove the sort
  and the default model set in Manage Models stops taking effect.
- **`tintColor` didn't render on an asset in `List.EmptyView`**, neither SVG nor PNG. The logo
  there is a themed pair with the color drawn in: `assets/osaurus-logo.svg` and
  `assets/osaurus-logo@dark.svg`.
- **Saved state lives in `useCachedState` keys**, some shared across commands: `default-model`
  (set in Manage Models, read by Ask), `last-model` (Ask's last pick), `hidden-models` (Manage
  Models), `recent-model-searches` (Search Models), and the sidebar toggles `show-detail-models`
  and `show-detail-history`. Renaming a key silently resets it for users.
- **`potion-base-4m` is Osaurus's built-in embedding model**, used by its memory feature.
  `/api/show` returns 404 for it; Manage Models explains it rather than showing an error.
  `foundation` is Apple's on-device Foundation Model and reports no size, quantization, or
  context, so Manage Models shows only the rows a model actually reports.

## Checks

There is no test suite. Before submitting, run `npx tsc --noEmit`, `npm run lint`, and
`npm run build`; `ray build` doesn't typecheck.
