# Hermes Changelog

## [English interface] - {PR_MERGE_DATE}

- **The whole interface is now in English.** Raycast does not localize an extension: the
  command titles, the descriptions the Store shows, the screen copy and the error messages
  are fixed strings in the package, and whoever installs it anywhere in the world reads
  what is written there. Until now that was Brazilian Portuguese.
- Command names changed with it. **Ask Hermes** was `Perguntar ao Hermes`,
  **Hermes Conversations** was `Conversas do Hermes`, **Run a Task in Hermes** was
  `Executar tarefa no Hermes`, **Hermes Tasks** was `Execuções do Hermes`, and the other
  eleven follow the same rule. The deep link does not change: `raycast://extensions/savio22/hermes/<name>` still
  points at the same commands, because only the titles were translated.
- **The clipboard commands answer in English now, and that is a behaviour change.**
  `Summarize Clipboard` used to ask for a summary in Brazilian Portuguese and now asks for
  one in English; the same goes for the default question of `Ask About Selection`.
  `Fix Clipboard Text` is the exception and does not change: it always told Hermes to keep
  the original language, and it still does.
- `Translate Clipboard` keeps detecting the language, and the Portuguese↔English pair still
  works both ways. What changed is the tie-break: when the text is too short or too mixed
  to tell, the automatic request now translates into English instead of Portuguese.
- Numbers and dates leave the Brazilian format. A tool that took four tenths of a second
  reads `0.4 s` rather than `0,4 s`, the technical-details stamp is `yyyy-mm-dd`, and the
  relative date in the conversation picker reads `2 h ago`.
- Nothing else moved. The screens, the shortcuts, the queue, the approval flow and the
  discovery order are exactly what they were.

## [macOS and Windows] - {PR_MERGE_DATE}

- The extension is now declared for both systems (`"platforms": ["macOS", "Windows"]`), on
  the same code base. Nothing about the current Windows behaviour changes.
- Hermes is found on its own at `~/.hermes` on macOS. The discovery order stays the same on
  both systems: `HERMES_HOME` → `gateway.pid.hermes_home` → the platform default folder.
  Support for `%LOCALAPPDATA%\hermes` on Windows is untouched.
- The manual setup screen now names the programs of the system you are on — Finder and
  TextEdit on a Mac, File Explorer and Notepad on Windows — and the same goes for the keys
  in the screen copy (`Ctrl+C`/`Cmd+C`, `Ctrl+K`/`Cmd+K`, `Ctrl+Enter`/`Cmd+Enter`).
- Custom shortcuts now declare the keys of each system through the shape the Raycast API
  itself offers (`{ Windows, macOS }`). On Windows they are letter for letter what they
  were; on macOS they respect `Cmd`. Where a semantic equivalent exists,
  `Keyboard.Shortcut.Common.*` is still the first choice.
- The memory scope (`sessionKey`) gains a per-system default. **Nobody is migrated:** anyone
  already using it on Windows stays on `raycast:windows:default`, and a fresh macOS install
  starts on `raycast:macos:default`. The manifest stopped fixing a `default` precisely so
  that changing this value later does not move the scope of someone who never touched the
  field.
- Opening a conversation in Hermes Desktop became defensive: if the `hermes://` scheme is
  not registered, the extension says so instead of failing silently.
- **Validated by hand on Windows 11 only.** The automated tests cover both code paths, but
  the first pass on a Mac — keyboard, deep link and manual setup — still has to be done. The
  script is in `docs/CHECKLIST-MANUAL.md`.

## [Reliability fixes] - {PR_MERGE_DATE}

- Stops a conversation switch during the model choice from sending a question to the wrong
  destination.
- Hides `Continue This Conversation` while the task is still active, avoiding two tasks
  going at once in the same conversation.
- Persists the local queue, reattaches non-terminal tasks and keeps the retention rule from
  evicting active ones.
- Ships the Skills, Tools and Automations screens and the four clipboard commands with input
  limits and protection against copied instructions.
- Tests, types and a production build verified. The Windows manual checklist was walked by
  hand, more than once, on Windows 11 with Raycast 2.0.3 and Hermes 0.20.4 — the streaming,
  approval and keyboard scenarios no automated test reaches.

## [First version] - {PR_MERGE_DATE}

First public version of the Hermes Agent extension for Raycast on Windows. (macOS support
arrived later; see the [macOS and Windows] entry above.)

### The idea

The Raycast conversations and the Hermes Desktop conversations are the same conversations.
What you ask here shows up there, and what started there can be continued here. Closing the
Raycast window cancels nothing: the task keeps going inside Hermes and comes back ready in
**Hermes Tasks**.

### First run

- The extension discovers on its own the address of the Hermes installed on this computer —
  the port from `config.yaml`, the environment variable, the `.env` and, last, the default
  port — and confirms it was really Hermes that answered, not another program.
- The welcome screen says what it found before you press Enter: the Hermes version and the
  address, or that it is off.
- The access key is read from your Hermes **through an action of yours**, never silently. It
  is tested before being stored, it lives in the protected Raycast storage, and it never
  appears on a screen, in an error message or in a technical detail.
- If you would rather, **Manual Setup** walks you through it step by step, with no terminal.

### The commands

Ask Hermes, Hermes Conversations, Run a Task in Hermes, Hermes Tasks, Hermes Models, Hermes
Skills, Hermes Tools, Hermes Automations, Ask About Selection, Summarize Clipboard, Fix
Clipboard Text, Translate Clipboard, Paste Latest Answer, Check Hermes Connection and
Configure Hermes.

### Privacy

The extension talks only to `127.0.0.1` — the Hermes running on your own machine. Nothing is
sent to external servers.
