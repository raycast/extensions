# PR1 brief: one run path, one field renderer

Worktree: `/Users/christian/Developer/raycast-quickadd-wt/pr1-one-run-path` (branch `one-run-path`, off `main`). Work only there.

## Why

The extension has two parallel ways to collect a choice's inputs. The older "Run in Background" path (`quickadd:check` -> `ChoiceForm` -> `quickadd:run`) in `src/run-choice.tsx` and the default interactive path (`quickadd:interactive` -> `FormPrompt` in `src/interactive-session.tsx`). They render form fields with two different, inconsistent renderers. The interactive one, which is the default, is the weaker: it always draws a plain dropdown for any field with options, so multi-select fields, custom values, and number ranges only work on the path nobody uses by default.

The plugin already batches one-page inputs into a single `form` prompt and `quickadd:interactive` accepts `vars`, so the check-then-run path is dead weight. Delete it and keep one renderer.

## Outcome for the user

"Run" (default) and "Run in Obsidian" remain. "Run in Background" is gone. Every form the user sees, whether a one-page form, a script's `requestInputs`, a lone `inputPrompt`, a `datePrompt`, or a `multiselect`, is drawn by the same code and supports:

- text and multi-line text
- numbers with min/max validation (inline `error` on the field, no toast)
- dates, with a time picker when the field's `dateFormat` contains hour/minute/second tokens outside `[...]` brackets, or when a standalone date prompt says `withTime`
- single select (dropdown) with an optional custom-value text field when `suggesterConfig.allowCustomInput`
- note pickers (`picker: "file"`, single, not optional) that start on an empty "Select..." row and refuse to submit until picked (this is the behavior PR #1 added; keep it)
- multi select as a `Form.TagPicker`, with an optional comma-separated custom-values field when `allowCustomInput`
- required-field enforcement with inline errors

## Data shape (decided; do not re-litigate)

New pure module `src/lib/fields.ts`:

```ts
interface FieldBase { id: string; label: string; optional: boolean; description?: string }
interface Option { value: string; title: string }

export type FieldSpec =
  | (FieldBase & { kind: "text"; multiline: boolean; placeholder?: string; defaultValue?: string })
  | (FieldBase & { kind: "number"; placeholder?: string; defaultValue?: string; min?: number; max?: number })
  | (FieldBase & { kind: "date"; defaultValue?: string; withTime: boolean })
  | (FieldBase & { kind: "select"; options: Option[]; allowCustom: boolean; notePicker: boolean; defaultValue?: string })
  | (FieldBase & { kind: "multi"; options: Option[]; allowCustom: boolean; preselected: string[] });

/** Parse one wire FormField (from a `form` prompt) into a FieldSpec. Boundary parse; everything after this trusts the union. */
export function fieldSpecFromForm(field: FormField): FieldSpec;

/** The one-field specs for the scalar prompts, so they render through the same control. */
export function fieldSpecFromPrompt(prompt: InputPrompt | DatePrompt | MultiselectPrompt): FieldSpec;

/** Raycast form value(s) for one field -> the reply value, or a validation error to show inline. */
export type FieldRead = { ok: true; value: string | string[] } | { ok: false; error: string };
export function readField(spec: FieldSpec, raw: unknown, custom: unknown): FieldRead;
```

Rules for `fieldSpecFromForm`:
- `textarea` -> text multiline. `text` and any unknown type -> text. `number` and `slider` -> number with `numericConfig`/`sliderConfig` min/max.
- `dropdown`, `suggester`, `field-suggest` with a non-empty `options` -> `select` (or `multi` when `suggesterConfig.multiSelect`). With no options -> text (the plugin sends field-suggest without options today).
- `notePicker` is `picker === "file"` and not multiSelect.
- `date` -> date; `withTime` = `/[HhkmsS]/.test(dateFormat with [bracketed] literals removed)`.
- `displayOptions[i] ?? options[i]` is the title.

Rules for `readField`:
- text/number: empty and not optional -> error "Required". number: not a finite number -> "Enter a number"; outside min/max -> "Between {min} and {max}" (or "At least"/"At most" when one bound). Value returned as the trimmed string.
- date: `Date` -> `toISOString()`. Null and not optional -> "Required". (The plugin prefixes `@date:` itself for form fields and strips it for date prompts, so plain ISO is right for both.)
- select: a non-blank custom text wins. Else the dropdown value. notePicker with "" and not optional -> "Required".
- multi: tag picker array plus custom comma-separated entries (trimmed, non-empty). Empty and not optional -> "Required". Returns `string[]`. Do NOT wrap in `[[ ]]`; the plugin's formatter handles `multiEmit`.

Form item ids stay positional: `field-${index}` and `field-${index}-custom` (QuickAdd field ids contain characters Raycast rejects as ids).

Reply shapes (unchanged wire contract):
- `form` prompt reply: `Record<fieldId, string | string[]>`.
- `input` and `date` prompt reply: the scalar string.
- `multiselect` prompt reply: `string[]`.

## Rendering

One component `FieldControl({ spec, id, error, onChange })` returning the Raycast control(s) for a spec, in a new `src/form-field.tsx` (or inside `interactive-session.tsx` if you judge the file stays readable; it is already ~780 lines, so prefer the new file). `FormPrompt` maps `prompt.fields` through `fieldSpecFromForm`, renders `FieldControl`s, validates with `readField` on submit, shows per-field inline errors (`error` prop) and clears an error on change. `InputPrompt`, `DatePrompt`, `MultiSelectPrompt` become one-field uses of the same form (via `fieldSpecFromPrompt`); delete their bespoke bodies. `SuggesterPrompt` stays a searchable `List` (that is the right control for a single pick with search), as does confirm/checkbox/info.

## Delete

- In `src/run-choice.tsx`: the "Run in Background" action, `runOrCollectInputs`, `ChoiceForm`, `RequirementField`, `toVariableValue`, and the helper predicates (`fieldId`, `customFieldId`, `isMultiSelect`, `allowsCustomInput`, `hasOptionList`, `isSingleNotePicker`). `DirectChoice` currently calls `checkChoice` only to learn the choice name; `quickadd:interactive` already returns `choice: {id, name, type}` in its start response, so extend `startInteractive` to return it and drop the check call.
- In `src/lib/obsidianCli.ts`: `checkChoice`. Keep `runChoice` (used by "Run in Obsidian" with `ui`) and `runChoiceByName` (Quick Capture).
- In `src/lib/types.ts`: `CheckResponse`, `FieldRequirement`, `FieldType` if nothing uses them after the deletion.
- `src/lib/format.ts`: `formatDate` (only the deleted path used it). Keep `choiceIcon`.
- The duplicated `FormField` interface in `src/lib/interactive.ts` is the wire type; keep it there as the single source (it mirrors the plugin's `src/interactive/promptProtocol.ts`), but remove `withTime` from it (the plugin never sends it on form fields; it is derived from `dateFormat`).

## Docs

`README.md` and `ARCHITECTURE.md` still describe check-then-run as the main path. Rewrite the affected sections so they describe only: list -> interactive run -> prompts rendered natively -> done; "Run in Obsidian" as the escape hatch. Drop the `quickadd:check` bullets. Keep the QuickAdd version requirement notes accurate (fields with `picker: "file"` need QuickAdd >= 2.31). Follow the `pstack:technical-writing` skill, then `pstack:unslop`. No em dashes anywhere (user rule), use "-".

## Tests

Add vitest (`pnpm add -D vitest`, `"test": "vitest run"` script, `vitest.config.ts` if needed; pnpm is the repo's tool, there is a `pnpm-lock.yaml`... check, and if the repo has no lockfile use pnpm). Tests in `src/lib/fields.test.ts` for `fieldSpecFromForm` and `readField`. Each test must be able to fail on a real defect (the `pstack:principle-test-behavior-not-implementation` skill): e.g. "required note picker with no pick returns an error", "multi returns an array and keeps custom entries", "custom text overrides the dropdown pick", "number outside max returns the bound in the error", "date format with HH:mm yields withTime", "date format with [H] in brackets does not". No tautologies, no snapshot tests.

## Live verification (mandatory, on the real surface)

1. Build an `e2e-vault/` in the repo root (committed; plugin binaries excluded via `.gitignore` entries for `e2e-vault/.obsidian/plugins/quickadd/main.js`, `styles.css`, and `e2e-vault/.obsidian/workspace.json`). It needs `.obsidian/community-plugins.json` enabling `quickadd`, `.obsidian/plugins/quickadd/manifest.json` + `data.json`, and a few notes. The `data.json` must define choices that together exercise every FieldSpec kind through the interactive `form` prompt plus the scalar prompts: a capture with `{{VALUE}}`; one with `{{VALUE:red,green,blue}}`; one with `{{VALUE:alpha,beta,gamma|multi}}`; one with `|custom`; one with `{{VALUE:n|type:number|min:1|max:5}}`; one with `{{VDATE:due,YYYY-MM-DD HH:mm}}`; a capture whose target needs a note pick (empty `captureTo`, so the one-page form carries a `picker: "file"` field); a Template with a `{{FILE:...}}` token; and a Macro user script calling `inputPrompt`, `wideInputPrompt`, `suggester` (with custom allowed), `checkboxPrompt`, `datePrompt`, `yesNoPrompt`, `infoDialog`, and `requestInputs`. Read the plugin source at `/Users/christian/Developer/quickadd/src/preflight/RequirementCollector.ts` and `src/utils/FieldSuggestionParser.ts` for the exact token syntax; do not guess. A script `scripts/setup-e2e-vault.sh` copies `main.js`, `manifest.json`, `styles.css` from `/Users/christian/Developer/quickadd` (the plugin's main checkout, already built) into the vault.
2. Register and open the vault: `open "obsidian://open?path=<abs path to e2e-vault>"`. Then `obsidian vault=e2e-vault quickadd:list` must list the choices. The Obsidian CLI is at `/opt/homebrew/bin/obsidian`. Obsidian is already running on this machine with other vaults open; do not close them.
3. Protocol-level proof: a small Node script under `scripts/` (kept, so a reviewer reruns it) that starts `quickadd:interactive` for each e2e choice, polls, answers every prompt with representative values using the same `readField` logic, and asserts the `done` result and the file content written into the vault. This proves the reply shapes the renderer produces are the shapes the plugin accepts.
4. Raycast-level proof: `pnpm dev` (`ray develop`) installs the extension into Raycast. Open each choice through its deeplink (`raycast://extensions/christian/quickadd/run-choice` with `?context=` JSON `{"choiceId": "..."}` URL-encoded; see `createDeeplink` in the code) using `open`, wait a second, and capture `screencapture -x /tmp/pr1/<slug>.png`. Inspect each PNG with the Read tool. Check field titles, the empty "Select..." note picker row, the tag picker, the custom field, and the inline "Required" error after an empty submit (drive the submit with `osascript -e 'tell application "System Events" to keystroke return using command down'`). If Raycast cannot be driven from scripts on this machine (permissions), say so explicitly with the error; do not report it as passed.
5. `pnpm lint`, `pnpm build`, `pnpm test`, and `npx tsc --noEmit` all green.

## Commit discipline

Small ordered commits that tell the story (the `pstack:principle-sequence-verifiable-units` skill): (1) add vitest and `fields.ts` with tests, (2) route the interactive prompts through `FieldControl`, (3) delete the check-then-run path and its types, (4) e2e vault + scripts, (5) docs. Run `/deslop` before committing and `/no-comments` before you report. Conventional Commit titles. No em dashes in any text you write. Do not open a PR; report back with the branch, the commit list, the test output, the screenshot paths, and anything you could not verify.

## Principles to apply (read each leaf SKILL.md)

`pstack:principle-subtract-before-you-add`, `pstack:principle-model-the-domain`, `pstack:principle-laziness-protocol`, `pstack:principle-type-system-discipline`, `pstack:principle-prove-it-works`, `pstack:principle-test-behavior-not-implementation`, `pstack:typescript-best-practices`.
