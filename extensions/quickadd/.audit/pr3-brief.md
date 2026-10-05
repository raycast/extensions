# PR3 brief: `[[` and `#` completion, Capture Selection

Two stacked branches, one owner. Base: branch `vault-discovery` (PR2c, verified). Worktree: `git -C /Users/christian/Developer/raycast-quickadd worktree add ../raycast-quickadd-wt/pr3 -b link-completion vault-discovery`. After 3a, branch `capture-selection` off `link-completion` in the same worktree.

Read `ARCHITECTURE.md`, `README.md`, `src/lib/fields.ts`, `src/form-field.tsx` (names may differ slightly; find the FieldSpec union and the FieldControl component PR1 introduced) and `src/lib/vaults.ts` first.

## PR3a `link-completion`

For the user: typing `[[` in any text field of a QuickAdd form opens a searchable list of notes, attachments, and aliases exactly as Obsidian's editor offers them. Typing `#` at the start of a word opens the vault's tags, most used first. Picking inserts `[[text]]` or `#tag` at the cursor position and returns to the form with the field focused.

Source of suggestions: the plugin's new `quickadd:suggest` CLI command (QuickAdd PR https://github.com/chhoumann/quickadd/pull/2175, built in the worktree `/Users/christian/Developer/quickadd-worktrees/cli-suggest`; copy its freshly built `main.js` into `e2e-vault/.obsidian/plugins/quickadd/` with the repo's setup script pointed at that worktree, then reload the plugin with `obsidian vault=e2e-vault plugin:reload id=quickadd`). Contract:

```
obsidian vault=<name> quickadd:suggest kind=links
-> { ok:true, kind:"links", items:[{ text:"Plan", path:"Projects/Plan.md" }, { text:"Plan|Big Plan", path:"Projects/Plan.md", alias:"Big Plan" }, ...] }
obsidian vault=<name> quickadd:suggest kind=tags
-> { ok:true, kind:"tags", items:[{ tag:"work", count:3 }, ...] }   // no leading '#', most used first
```

`text` is already what goes inside `[[...]]`; insert it verbatim. Show `alias` as the item title with the path as subtitle for alias items; otherwise the basename as title and the folder as subtitle. Tags show `#tag` with the count as an accessory. No filtering in the CLI; Raycast's `List` filters.

Data shape (decided):

```ts
// src/lib/suggest.ts
export type LinkItem = { text: string; path: string; alias?: string };
export type TagItem = { tag: string; count: number };
export async function suggestLinks(vault: Vault): Promise<LinkItem[]>;
export async function suggestTags(vault: Vault): Promise<TagItem[]>;

// src/lib/completion.ts (pure, tested)
/** Index of a `[[` the user just finished typing, comparing the previous and next field value; undefined when the edit did not end in a new `[[`. */
export function linkTriggerAt(prev: string, next: string): number | undefined;
/** Index of a `#` the user just typed at the start of a word (field start, after whitespace, or after `[[`-free punctuation); undefined otherwise. */
export function tagTriggerAt(prev: string, next: string): number | undefined;
export function insertLink(value: string, at: number, text: string): string;   // replaces the `[[` at `at` with `[[text]]`
export function insertTag(value: string, at: number, tag: string): string;     // replaces the `#` at `at` with `#tag `
```

Rendering: the text and textarea branches of `FieldControl` become controlled fields. On change, compute the trigger from the previous and next value. On a trigger, `push` a `LinkPicker` or `TagPicker` `List` (loading the items on mount; `isLoading` until the CLI answers; failure shows an empty view with the CLI error). Picking calls `insertLink`/`insertTag`, pops, and refocuses the field (`ref.focus()` after pop). Escape from the picker also refocuses. Each picker fetches on open; no caching layer.

Tests in `src/lib/completion.test.ts`: `[[` at end, `[[` in the middle after a paste, a second `[` that does not form a trigger, `#` at field start, `#` after a space, `#` mid-word (no trigger), `#` inside an existing `[[...]]` (no trigger), insertion keeps text after the trigger. Each must fail on the real defect.

Docs: README gets one short paragraph under the form section; ARCHITECTURE gets the `quickadd:suggest` bullet in the CLI list and the version note (needs the QuickAdd release that includes PR 2175; until released, say "QuickAdd with `quickadd:suggest`").

## PR3b `capture-selection`

For the user: a no-view command "Capture Selection" that sends the text selected in the frontmost app to a capture choice, so any highlighted text on the Mac lands in the vault without opening a window. Mirrors Quick Capture: `package.json` command `capture-selection` (mode `no-view`, per-command preference `captureChoice` exactly like `quick-capture`'s). Implementation: `getSelectedText()` from `@raycast/api`; empty or failing selection -> failure toast "No text selected"; otherwise the same run as Quick Capture with `vars: { value: text }`. Extract the shared run-and-report into one function both commands call (`src/lib/capture.ts`), so the two command files are each a few lines. Success toast uses `doneMessage` from PR2 if the run result carries `effect`/`file` (it does with `verify`). README: one bullet under Commands.

## Live verification (mandatory)

- `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` green on both branches.
- Links: in the e2e vault (which has a note with an alias and two notes sharing a basename; add them if PR1's fixture lacks them), open the text capture through Raycast, type `[[`, screenshot the picker, pick the alias item, screenshot the field showing `[[Plan|Big Plan]]`, submit, and check the vault file contains that link. Same for `#` with a tag. Screenshots to `/tmp/pr3/<slug>.png`, inspected with the Read tool.
- Selection: select text in TextEdit (or any app) via `osascript`, run the command through its deeplink `raycast://extensions/christian/quickadd/capture-selection`, and check the captured file contains the text. If driving the selection is not possible from scripts on this machine, say so with the error; do not mark it passed.

## Discipline

Delete before adding. No helper text under labels unless it prevents an error. Comments only for non-obvious why. No em dashes; use "-". `/deslop` before each commit, `/no-comments` before reporting. Conventional Commit titles. Do not open PRs. Report branches, commits, test output tails, live evidence, and what you could not verify.

Principles to read and apply: `pstack:principle-model-the-domain`, `pstack:principle-boundary-discipline`, `pstack:principle-laziness-protocol`, `pstack:principle-prove-it-works`, `pstack:principle-test-behavior-not-implementation`, `pstack:typescript-best-practices`.

## Notes from PR2 (read before starting)

- `pnpm` via the vite-plus shim is blocked by safe-chain; use `~/.vite-plus/package_manager/pnpm/10.32.1/pnpm/bin/pnpm`.
- The registered `e2e-vault` in Obsidian is `/Users/christian/Developer/raycast-quickadd-wt/pr2/e2e-vault` (PR2's worktree), open, running a QuickAdd HEAD build. Your worktree has its own copy of `e2e-vault/`; do not register a second vault with the same name (name collisions break CLI routing). Either keep using the registered one for Raycast runs (copy fixture changes into it as well as committing them in your worktree), or ask the parent to swap the registration. The user granted full authority over anything named e2e-vault; the user's other vaults (notes, worknotes, dev) are off limits.
- For `[[` completion the vault needs the plugin build from `/Users/christian/Developer/quickadd-worktrees/cli-suggest` (has `quickadd:suggest`). Build it there (`pnpm run build` with the pnpm path above), copy `main.js` into the registered e2e vault's `.obsidian/plugins/quickadd/`, then `obsidian vault=e2e-vault plugin:reload id=quickadd` and confirm `obsidian vault=e2e-vault quickadd:suggest kind=links` answers.
- Deeplinks carry the vault: `raycast://extensions/christian/quickadd/run-choice?context=<urlencoded {"vaultPath": "...", "choiceId": "..."}>`.
- Keystrokes: Raycast's panel is never reported as the frontmost process by System Events, so the old guard never fires. Use this guard instead, before every keystroke: `osascript -e 'tell application "System Events" to (count of windows of process "Raycast") > 0'` must print `true`, and send the keystroke as `tell application "System Events" to tell process "Raycast" to keystroke ...`. If the count is 0, do not send, and report. Deeplinks opening Raycast can still catch the user's typing in another app; keep the capture stretch short and say in the report when it ran.
- At the end, re-run `ray develop` briefly from `/Users/christian/Developer/raycast-quickadd` (main) so the installed dev build is main's again.
