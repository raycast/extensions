# Hermes for Raycast

[![CI](https://github.com/savio22/hermes-raycast/actions/workflows/ci.yml/badge.svg)](https://github.com/savio22/hermes-raycast/actions/workflows/ci.yml)

Talk to the **Hermes Agent already running on your machine** — without opening another app,
without leaving what you were doing. One shortcut, one question, the answer shows up right there.

> **On language.** The extension's interface — commands, screens, error messages — is in
> **English**. It was Brazilian Portuguese until the release described in
> [CHANGELOG.md](CHANGELOG.md). There is no i18n layer and there is no plan for one: Raycast does
> not localize an extension, so the strings shipped in the package are what everyone sees, and one
> language has to win. [README.pt-BR.md](README.pt-BR.md) is the Portuguese version of this
> document, and the documents under `docs/` are written in Portuguese.

- **Platforms:** macOS and Windows (`"platforms": ["macOS", "Windows"]` in the manifest). Same code
  base on both; see [Platform support](#platform-support) for what that means today.
- **Talks to:** `127.0.0.1` only — the Hermes API Server on your own machine. Nothing is sent to an
  external server.
- **Status:** not published on the Raycast Store yet; install from source (see
  [Development](#development)).

<!-- Demo GIF goes here once recorded: ![Demo](assets/demo.gif) -->

## The core idea: it is the *same* conversation as Hermes Desktop

This is not a second chat box living off to the side. Everything you ask here is stored in the same
place Hermes Desktop keeps its conversations.

In practice:

- You ask something from Raycast while working. Later you open Hermes Desktop and the conversation
  is there among its recent conversations, question and answer complete.
- The reverse holds too: conversations started in Hermes Desktop show up under **Hermes
  Conversations** and can be continued from Raycast.
- Every conversation has an **Open in Hermes Desktop** action that focuses that exact conversation
  in the app.

And the promise that makes this usable day to day: **closing the Raycast window cancels nothing.**
If you ask something long and the window disappears, the task keeps running inside Hermes. It comes
back in **Hermes Tasks** with the answer ready. Only the **Stop** action actually cancels.

## Requirements

- **macOS or Windows**, with Raycast installed ([Raycast for Windows](https://www.raycast.com/windows))
- **Hermes Agent** running locally (the Hermes API Server must be up — default `127.0.0.1:8642`)
- **Node.js 24+**, only to build the extension from source

### Platform support

The extension is declared for **macOS and Windows** and runs the same code on both. What actually
differs is small and lives in three places:

| | Windows | macOS |
| --- | --- | --- |
| Default Hermes folder | `%LOCALAPPDATA%\hermes` | `~/.hermes` |
| Shortcut modifier | `Ctrl` / `Alt` | `Cmd` / `Opt` |
| Names in the manual setup screen | File Explorer, Notepad | Finder, TextEdit |

Discovery order is the same on both and does not change: `HERMES_HOME` from the environment →
`hermes_home` inside `gateway.pid` → the platform default above. So a non-standard install is found
on either system without touching preferences.

> **Honest status:** every automated gate (316 tests, types, lint, release build) runs on both code
> paths, but this branch has only been exercised **by hand on Windows 11**. The macOS run — the
> keyboard, the `hermes://` deep link into Hermes Desktop, and Finder/TextEdit in the manual setup
> screen — still needs a first pass on real hardware. See
> [docs/CHECKLIST-MANUAL.md](docs/CHECKLIST-MANUAL.md).

## Setup (no terminal required)

1. Install the extension in Raycast (from source for now — see [Development](#development)).
2. Keep **Hermes** running on this machine.
3. Open Raycast and run any Hermes command — for example **Ask Hermes**.

On first run the extension shows a welcome screen that already knows what it found: it looks for
the Hermes on this machine, discovers the right port, and states it on the first line ("Found
Hermes 0.20.4 here, at 127.0.0.1:8642") or tells you it is off. Then it is one Enter on **Detect
the Setup Automatically**: the extension reads the local access key, tests the connection and
stores the key securely.

That Enter is deliberate. The Hermes key is a secret sitting in a file of yours, and the extension
does not go reading your files looking for secrets unless you tell it to. Discovering the **port**
is a different matter and always happens on its own.

If auto-detection finds nothing, use the **Configure Hermes** command. It walks you through where
the Hermes config file lives, opens the folder for you, and lets you paste the key manually. The
same command fixes the configuration later — for example if the Hermes key gets rotated.

The instructions on that screen name the programs of the system you are on: File Explorer and
Notepad on Windows, Finder and TextEdit on macOS.

To check things are working at any time, run **Check Hermes Connection**.

### About the key

The Hermes key is local: it never leaves your computer and is never sent to any external server.
The extension talks only to `127.0.0.1`. In technical details and error messages the key is always
redacted.

## Commands

Fifteen commands, all keyboard-driven. No action exists as a shortcut only — `Ctrl+K` (`Cmd+K` on
macOS) opens the full action list on every screen.

| Command | What it is for |
| --- | --- |
| **Ask Hermes** | Quick question, answer on the spot. Continue the conversation, branch it, rename, copy, open in Hermes Desktop. |
| **Hermes Conversations** | List, search and continue your conversations — including the ones born in Hermes Desktop. Rename, pin, archive. |
| **Run a Task in Hermes** | For longer requests: shows every step through to the final result, with approval prompts when Hermes asks for permission. |
| **Hermes Tasks** | The panel of what is in flight: follow along, answer approvals, stop, and reopen recent results. |
| **Hermes Models** | See the models available in your Hermes and pick the default the extension uses. |
| **Hermes Skills** | See which skills are enabled in your Hermes and what each one does. |
| **Hermes Tools** | See your Hermes tool groups and which ones are ready to use. |
| **Hermes Automations** | Follow Hermes automations; pause, resume or run one right now. |
| **Ask About Selection** | Ask about the text you selected or copied, without leaving what you were doing. |
| **Summarize Clipboard** | Summarize the text you just copied, as bullet points. |
| **Fix Clipboard Text** | Fix spelling, grammar and punctuation of copied text, no commentary. Keeps the original language. |
| **Translate Clipboard** | Translate copied text between English and Portuguese, or into a language you name. |
| **Paste Latest Answer** | Paste the most recent Hermes answer into whatever app you are in. |
| **Check Hermes Connection** | Diagnostics: is Hermes up? Does the key work? Which address is in use? |
| **Configure Hermes** | Connect or reconnect the extension to Hermes, auto-detected or manual. |

### How the conversation list refreshes

While **Hermes Conversations** is open, the 4-second poll revalidates only the first page. Older
pages you already loaded stay as they are; use the **Refresh the List** action to revalidate that
part of the list too.

## Known limitations

Worth being honest about what is outside this version:

- **English-only interface.** Every string is hard-coded English. Raycast does not localize an
  extension, so there is no i18n layer — and adding one would not help, because the Store shows
  whatever single set of strings the package ships.
- **Automations, skills and toolsets have screens, but availability depends on your Hermes.** An
  HTTP `501` marks **Hermes Automations** as unavailable — it does not hide the command or pretend
  the list is empty.
- **`jobs_admin` is off on this Hermes server** (`GET /v1/capabilities` answers
  `"jobs_admin": false`, verified on 0.20.4). That does not hide the screen: the command queries
  the real route and reports unavailability only when the server answers `501`.
- **Branching a conversation does not sync like the rest.** With **Branch the Conversation**, Hermes creates the
  child conversation with origin `api_server`, and it **does not appear in the Hermes Desktop main
  list** (the original conversation still does). The extension warns you at that moment.
- **The default model picked in Hermes Models applies to the extension only.** Hermes Desktop
  keeps its own.
- **Model providers are configured by Hermes Desktop.** If no provider is authenticated, the
  extension explains the problem but does not solve it for you.
- **Local Hermes only.** The extension talks exclusively to `127.0.0.1` and has no remote mode.
- **macOS support is implemented but not yet validated on a Mac.** The code paths are covered by
  the automated suite and the manifest declares both systems, but nobody has run it on macOS end to
  end yet. Deep-link and keyboard behaviour there are the two things most likely to need a nudge.
- **Actions that depend on a live Hermes still need manual validation per machine.** The automated
  suite covers contracts, safety, queueing, persistence and parsing; the keyboard checklist and the
  streaming/approval scenarios live in [docs/CHECKLIST-MANUAL.md](docs/CHECKLIST-MANUAL.md).
- **Voice, long-term memory and session features** exposed by Hermes have no interface here.
- **Not on the Raycast Store yet.** Until then, installing means running the developer step below
  once on this machine.

When something goes wrong, the extension always shows a message explaining what happened and what
to do, with **Copy Technical Details** for when you need to ask for help.

## Development

Requirements: Node.js 24+ and Raycast installed (macOS or Windows).

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run lint
```

> **Windows gotcha:** on Windows the build **must** use `--target release` (every npm script here
> already does). Without it the output lands in the old Raycast X path and Raycast reports
> `Missing executable`. The flag is harmless on macOS, so the scripts are the same on both.

Tests run on the Node.js test runner with no external framework — types are stripped by Node
itself, which is why **Node 24 is a hard requirement**. Older Node fails on the type annotations
with a syntax error that does not look like a version problem.

```bash
npm test
```

The suite currently has 316 deterministic tests, including the platform-default resolution for
macOS and Windows (`tests/platform.test.ts` and the discovery block in `tests/discovery.test.ts`).
Those tests inject the platform instead of reading `process.platform`, so the macOS cases pass
while running on Windows and vice versa. Type checking, lint and build are separate gates:

```bash
npx tsc --noEmit -p tsconfig.json
```

```bash
npx tsc --noEmit -p tests/tsconfig.json
```

### Layout

- `src/lib/` — the rules: server discovery (`discovery`), HTTP client and routes (`hermes-api`),
  SSE event reading (`hermes-events`), error catalog (`errors`), state labels (`status`),
  preferences (`preferences`), local storage (`storage`), the per-system wording (`platform`) and
  types (`types`).
- `src/hooks/` and `src/components/` — run-tracking logic and the shared screens (approvals,
  progress, first run).
- `src/<name>.tsx` — one file per command declared in `package.json`.
- `docs/` — the documents that govern the project, in priority order:
  [`DECISOES-VERIFICADAS.md`](docs/DECISOES-VERIFICADAS.md) (decisions proven against a real
  Hermes) → [`UX-SPEC.md`](docs/UX-SPEC.md) (screens, copy, shortcuts) →
  [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) (module contracts, error catalog, traps) →
  `docs/research/` (the API research everything rests on). These documents are written in
  Portuguese.

Two rules that are not details. **Never** put `cmd` in the Windows half of a shortcut (Windows
silently ignores it): custom shortcuts are declared as `perPlatform(Windows, macOS)` in
`src/components/shortcuts.ts`, and `Keyboard.Shortcut.Common.*` is preferred wherever a semantic
equivalent exists, because Raycast already maps those per system. And **never** call a run's stop
endpoint from a `useEffect` cleanup — unmounting a screen cancels only the local reader, while the
task stays alive inside Hermes.

## Contributing

Bug reports and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first — it
covers the gates a change has to pass and the conventions this codebase actually follows.

Security issues: [SECURITY.md](SECURITY.md). Where the project is headed: [ROADMAP.md](ROADMAP.md).
What changed: [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE) © Savio Aglio (Chacal)
