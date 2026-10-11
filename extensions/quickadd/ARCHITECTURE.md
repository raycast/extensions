# Architecture

This extension is a thin front end over [QuickAdd](https://github.com/chhoumann/quickadd). It does not reimplement any QuickAdd behavior; it drives the plugin through the official Obsidian CLI and renders the results as native Raycast UI.

## Transport: the Obsidian CLI

Obsidian ships a command-line interface (Settings → General → Command line interface). QuickAdd registers handlers on it, so anything you can trigger in the plugin is reachable from a subprocess that returns JSON:

- `quickadd:list [type=...] [commands]` - the flattened choice tree: `id`, `name`, `type`, `path` (`Multi / child`), `command`, `runnable` (a Multi is a folder, not runnable), and `currentNote` (`none`, `optional`, or `required`: whether the choice reads the current note).
- `quickadd:interactive id=<id> [vars=<json>] [current=<path>|none]` - starts a choice and returns at once with the choice (`id`, `name`, `type`) and the address of a local prompt server (`host`, `port`, `sessionId`, `token`). QuickAdd then sends each prompt to that server instead of opening a modal.
- `quickadd:run choice=<name>|id=<id> [vars=<json>] [current=<path>|none] [ui] [verify]` - runs a choice to completion. **Run in Obsidian** passes `ui` so QuickAdd prompts inside the app. Quick Capture, Capture Selection, and Capture Clipboard pass their text through `vars`. `verify` returns the created file path and an honest success or failure for Template and Capture choices.
- `quickadd:suggest kind=links|tags` - completion items for text fields. `links` returns one item per note, attachment, and alias, each with `text` (what goes inside `[[...]]`) and `path`, plus `alias` on alias items. `tags` returns each tag without its `#` and its `count`, most used first. The CLI does no filtering; Raycast's `List` filters as the user types.

The extension shells out with `execFile` (each argument is a separate argv entry, so no shell quoting is needed for values with spaces or newlines) and parses the JSON envelope.

### Why the CLI, not something else

- **`obsidian://quickadd` URIs** are one-way, cannot list choices, and restrict callback schemes, so Raycast could never answer a prompt through them.
- **Community REST-API plugins** add a third-party dependency and a running server.
- **A custom socket server in the plugin** is heavier than needed when a first-party CLI already exists.

The CLI is two-way, first-party, and already shipped.

## Client contract

A few CLI behaviors the client (`src/lib/obsidianCli.ts`) normalizes:

- The CLI exits `0` on plugin-level errors and prints `{ok:false, error}` on stdout; it exits non-zero on aborted runs but still prints that JSON envelope. Transport failures (`Vault not found.`, Obsidian not running) are plain text. The client parses JSON from both the success and failure paths and only throws for genuine transport errors.
- Choice enumeration goes through `quickadd:list`, never by reading `data.json`. The plugin owns flattening and runnability; duplicating that in the client would break on schema changes.

## Which vault

The CLI and `obsidian://` URIs address a vault by name, the basename of its folder. `src/lib/vaults.ts` reads Obsidian's vault list (`~/Library/Application Support/obsidian/obsidian.json`) and picks the vault in this order:

1. The `vaultPath` in the launch context. Quicklinks carry it, so a pinned choice always runs in the vault it came from. The capture commands read it too.
2. The **Vault** preference.
3. The only registered vault with QuickAdd installed and enabled. When several have it, **Run QuickAdd Choice** lists them, and the capture commands ask for the preference.

The extension refuses a vault whose name another registered vault shares, because the CLI could reach the wrong one.

Before it runs anything, `ensureVaultReady` checks that Obsidian serves the vault (`vault info=path` answers with its path). If not, it opens `obsidian://open?vault=<name>` once, which also starts Obsidian, and polls every 500 ms for up to 20 seconds until the vault answers and `quickadd:list` lists the choice. Opening a vault brings Obsidian to the front, so **Run QuickAdd Choice** then reopens itself through its own deeplink to bring Raycast back. A `relaunched` flag in that deeplink stops it from doing so twice.

## Per-choice flow: one interactive run

1. `quickadd:list` fills the searchable list, grouped by Multi folder.
2. **Run** calls `quickadd:interactive` for the selected choice. When its `currentNote` is `optional` or `required`, `CurrentNotePicker` (`src/completion-pickers.tsx`) asks for the note first and the run gets `current=<path>`, or `current=none` from the **No current note** row that an optional choice offers.
3. The extension long-polls the prompt server's `/poll`. Each event is a `prompt`, `done`, `error`, or an `idle` keepalive. The list stays on screen until the first prompt arrives, so a choice without prompts finishes with just a toast. If nothing arrives within three seconds, the list hands its poll to the run's view.
4. Each prompt renders as a native control, and the answer goes back through `/reply`. QuickAdd collects a choice's declared inputs first, as one `form` prompt. Prompts that a macro script raises later arrive one at a time.
5. The `done` event names the file and its `effect`, so the finish message reads "Created <file>" or "Added to <file>" and offers **Open in Obsidian**. Without a created or changed file it reads "Ran <choice>".

Without `current=`, QuickAdd takes the current note from Obsidian's active tab, which from Raycast is whatever tab happens to be open, so every run sends `current=`: the pick, or `none` when the choice does not ask. A pinned Quicklink asks for the note the same way. `ensureVaultReady` returns the choices it listed, so the list and the Quicklink view decide from a fresh `currentNote`, never a cached one. A `current` in the launch context skips the picker, and the relaunch after opening a closed vault keeps it. **Run in Obsidian** passes no `current=`, because there the active tab is the user's. The capture commands cannot ask: a `required` choice fails with a message that points to **Run QuickAdd Choice**, and an `optional` one runs with `current=none`.

A pinned Quicklink opens the run's view at once instead of waiting on the list. A Quicklink pinned with an argument carries it as `value` in the launch context, and the run starts with `vars={"value": ...}`. Its link puts Raycast's `{argument | json-stringify}` placeholder in the URL-encoded context JSON; Raycast percent-encodes the quoted text, so the context still parses (`src/lib/quicklink.ts`). When the view has waited three seconds with no prompt, it says QuickAdd may be asking something inside Obsidian (a Templater prompt, for example) and offers **Open Obsidian** (⌘O).

**Cancel Run**, or leaving the run's view while the run is live, posts `/abort`. QuickAdd rejects the open prompt and every prompt the run raises later, so a run that is mid-work stops at its next prompt. The extension never aborts a run that has ended. `driveSession` in `src/lib/interactive.ts` holds the run's state (connecting, prompt, working, done, failed, cancelled) and owns these rules, so they are unit tested without Raycast.

Polling continues while a prompt is open. The poll is the server's only sign that Raycast is still there, so it can tell a slow user from a client that went away.

## One renderer for every form

`src/lib/fields.ts` parses each wire field into a `FieldSpec`: text, number, date, select, or multi. The wire type is `FormField` in `src/lib/interactive.ts`, which mirrors QuickAdd's `src/interactive/promptProtocol.ts`. The `input`, `date`, and `multiselect` prompts become one-field specs, so every form goes through `FieldControl` in `src/form-field.tsx`. On submit, `readField` turns each field's Raycast value into the reply value, or into an error shown on the field.

- A date field gets a time picker when its `dateFormat` has hour, minute, or second tokens outside `[...]` literals.
- A number field rejects text that is not a number and values outside `numericConfig`'s `min` and `max`.
- A select or multi field with `allowCustomInput` gets a text field for values outside the list. For multi, the text field takes comma-separated values.
- As in QuickAdd's one-page form, a single-note picker (`picker: "file"`) starts with no note picked, and the form won't submit until a required one has a pick.

Text and number fields are controlled, because Raycast clears an uncontrolled text field when the form re-renders with its error. When an edit to a text field ends in a new `[[`, or types `#` at the start of a word, the field pushes `LinkPicker` or `TagPicker` (`src/completion-pickers.tsx`), which loads its items from `quickadd:suggest`. A pick replaces the trigger with `[[text]]` or `#tag` followed by a space when none is there, and the field takes focus again when the picker closes. The trigger rules are pure functions in `src/lib/completion.ts`.

The suggester, confirm, checkbox, and info prompts keep their own views. A suggester is a searchable list, which suits a single pick from many items.

A newer QuickAdd can send a prompt type this extension does not know. `nextEvent` turns it into an `unknown` prompt, which shows a screen that names the type, asks the user to update the extension, and offers **Cancel Run**.

Form item ids are positional (`field-0`), not field ids, because QuickAdd field ids can contain characters that stop Raycast from submitting the form. The reply maps them back to field ids.

## Version requirement

**Run** needs **QuickAdd >= 2.17.2**. `quickadd:interactive` exists from 2.16, and from 2.17.2 it collects a choice's declared inputs as one form even when QuickAdd's one-page input setting is off. Before that, the inputs arrive one prompt at a time.

**QuickAdd >= 2.20** added `/abort` and the `effect` field. Before it, **Cancel Run** does not stop the run in Obsidian, and the finish message always reads "Ran <choice>".

The `verify` flag that **Run in Obsidian** and the capture commands pass needs **QuickAdd >= 2.14**. Older versions ignore it, and some captures can report success without writing.

`[[` and `#` completion needs **QuickAdd >= 2.31**, which added `quickadd:suggest`. Before it, the picker says which version it needs.

Asking for the current note needs **QuickAdd >= 2.32**, which added `current=` and `currentNote`. Older versions send no `currentNote`, so the extension asks for nothing and the run uses the active tab.

In the one-page form, note pickers start empty only with **QuickAdd >= 2.31**, which marks them with `picker: "file"`. Older versions send them as plain suggesters, so they keep the first note picked.
