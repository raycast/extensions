---
name: delphitools-raycast-command
description: Use when creating, implementing, planning, or reviewing a new Raycast root Command for a delphitools CLI Tool in this repo. Trigger for requests like creating a Raycast command for a tool, wrapping a delphitools command, adding command entries to package.json, designing Raycast Form/Detail/List UI for delphitools commands, or updating docs/progress.md for command implementation status.
---

# Delphitools Raycast Command

## Workflow

1. Read `docs/progress.md` first. If the tool is already implemented or not planned, state that and inspect the existing implementation before deciding whether to extend it. If it is not started, move it to Implemented only after the command is actually added.
2. Read `docs/delphitools/<command>.md`, then discover live CLI behavior with `delphitools <command> --help`. Probe unclear arguments with small valid and invalid examples. Treat docs as a starting point, not the source of truth for accepted values.
3. Inspect current command patterns in `package.json` and `src/`. Prefer existing helpers for install detection, selected-text/clipboard fallback, local CLI execution, toasts, and snappy first render.
4. Design the Raycast UI before editing:
   - Pick the root Command name/title/description.
   - Decide Form, Detail, List, or Grid based on the tool output.
   - Prefer optional Raycast command arguments for root-search input.
   - Use dropdown arguments and `Form.Dropdown` for finite CLI choices.
   - Use selected text first, clipboard fallback second, unless the tool is file-first or the docs imply a different source.
5. Implement the command:
   - Add the manifest entry in `package.json`.
   - Add `src/<command>.tsx`.
   - Use `delphitools <command> --quiet ...` for stdout-oriented tools.
   - Do not use `--output` unless the command fundamentally writes files.
   - Do not add network behavior.
   - Show existing install guidance when `delphitools` is missing.
   - Show `showToast({ style: Toast.Style.Failure })` for CLI errors users can recover from.
6. Update `docs/progress.md` with the actual implemented behavior, including discovered finite options such as algorithms, formats, encodings, or modes.
7. Validate with `npm run lint` and `npm run build`. If sandbox blocks Raycast output or online validation, rerun with escalation. Report existing manifest warnings separately from new failures.

## UI Defaults

- Make the command feel snappy: render the final interactive UI immediately, then hydrate install status, selected text, clipboard contents, or other slow state in the background.
- Avoid transient loading-only Detail screens when a user can already interact.
- Keep copy-to-clipboard as the default action for generated text/image results.
- Use non-editable output presentation for computed results, usually `Form.Description` for Form-based tools or `Detail` for larger inspection views.
- Keep local input editable before execution. Prefer live/debounced execution for small text tools; use explicit submit for expensive, file-based, or destructive commands.
- Preserve user input and keep the user in the same view after recoverable CLI failures.

## Sources

Read these when relevant:

- `docs/progress.md`: implementation status and native/not planned decisions.
- `docs/delphitools/<command>.md`: generated tool docs and high-level inputs/options.
- `docs/adr/0001-raycast-native-wrapper-over-local-cli.md`: architectural rules, local-only behavior, snappy UI, and optional argument preference.
- `CONTEXT.md`: project vocabulary for Command, Action, Tool, Manifest, and delphitools.
- `skills/raycast-extension-best-practices/SKILL.md`: Raycast implementation checklist.
- `skills/raycast-extension-best-practices/references/raycast-extension-guidelines.md`: detailed Raycast guidance and source URLs.
- Existing implementations in `src/encode.tsx`, `src/decode.tsx`, `src/text-codec-command.tsx`, and `src/hash.tsx` for text-input patterns.
- `src/delphitools-install.tsx`: dependency detection and install guidance view.

## CLI Discovery Checklist

- Run `delphitools <command> --help`.
- Identify required positional arguments, optional positional arguments, flags, defaults, and output shape.
- For every unclear finite parameter, test invalid input and read the error message. Example: `delphitools hash nope hello` revealed `md5`, `sha256`, and `sha512`.
- Test one happy path through the CLI before coding.
