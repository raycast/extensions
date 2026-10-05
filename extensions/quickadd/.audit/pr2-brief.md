# PR2 brief: session hardening, frecency, vault discovery

Two stacked branches, one owner, in this order. Base: branch `one-run-path` (PR1, already verified). Create your worktree from it: `git -C /Users/christian/Developer/raycast-quickadd worktree add ../raycast-quickadd-wt/pr2 -b session-hardening one-run-path`. When PR2a is done, branch `vault-discovery` off `session-hardening` in the same worktree and continue. Do not touch `main`.

Read `ARCHITECTURE.md` and `README.md` in the worktree first (PR1 rewrote them) and keep them true after your change.

## PR2a `session-hardening` (src/lib/interactive.ts, src/interactive-session.tsx, src/run-choice.tsx)

For the user: cancelling a run always stops it in Obsidian, the finish message says what happened to the vault, a prompt the extension cannot show is explained instead of crashing, and a run that is waiting on something inside Obsidian offers "Open Obsidian".

1. **Abort.** The plugin's interactive server has `POST /abort?session&token` (see `/Users/christian/Developer/quickadd/src/interactive/interactivePromptServer.ts` around the `/abort` handler; it returns `{ ok, interrupted }` and rejects every pending prompt). Add `abortSession(s)` to `src/lib/interactive.ts`. "Cancel Run" calls it (instead of only replying `cancelled` to the open prompt, which does nothing when no prompt is open and the script is mid-work). Unmounting the session view (Escape) while the run is live also aborts. Never abort after the run ended. Model the session lifecycle as one state value (connecting | prompt | working | done | failed | cancelled) rather than a second boolean next to `userCancelledRef`; the view already has a `Phase` union, extend it instead of adding refs. A user cancel renders as "Cancelled", not as a failure.
2. **Effect wording.** The `done` event's `result` carries `effect: "created" | "changed" | "unchanged" | "unknown"` and `file` (see `src/cli/runChoice.ts` and the `outcome-effect` capability in the plugin). Type it in `SessionEvent` and use it: "Created <file>" for created, "Added to <file>" for changed, else "Ran <choice>". Apply in all three places a run finishes (list toast with the "Open in Obsidian" action, session view, Quicklink HUD). One function `doneMessage(choiceName, result)` with a unit test.
3. **Unknown prompt type.** The wire can carry a prompt type a newer QuickAdd adds. Parse at the boundary in `pollSession`: a `prompt` event whose `type` is not one of the known ones yields `{ kind: "prompt", requestId, prompt: { type: "unknown", wireType } }` (add that member to `PromptSpec` or a parallel union, your call, keep it typed). `PromptView` renders a `Detail` that says QuickAdd asked for a `<wireType>` prompt this version of the extension cannot show, suggests updating the extension, and offers Cancel Run. Unit test the boundary parse.
4. **Stalled run.** While `connecting` or `working` with no prompt for more than 3 seconds, show a description that QuickAdd may be asking something inside Obsidian (for example a Templater prompt) and add an "Open Obsidian" action (`open("obsidian://open?vault=<name>")`, shortcut cmd-O) beside Cancel Run. Reset the timer on every prompt.

Tests: `doneMessage`, the unknown-prompt boundary parse, and a session test against a tiny in-process fake HTTP server (node `http`) implementing `/poll`, `/reply`, `/abort` that asserts: cancelling while no prompt is open sends `/abort`; no `/abort` is sent after `done`. Each test must fail on the real defect.

Commit per item, Conventional Commit titles, e.g. `feat(session): abort the run in Obsidian on cancel`.

## PR2b frecency (one commit on `session-hardening`)

`useFrecencySorting` from `@raycast/utils` keyed by choice id. Keep the Multi grouping. Add a "Recent" section at the top with the visited choices in frecency order (at most 5), then the grouped sections as today (a choice may appear in both; give the Recent copy a distinct `key`). Call `visitItem` when a choice is run from the list. No test needed beyond lint/tsc; verify live.

## PR2c `vault-discovery` (branch off `session-hardening`)

For the user: the extension works with zero setup when one vault has QuickAdd, offers a vault list when several do, and starts Obsidian or opens the vault when it is closed, instead of failing with "Obsidian CLI returned no output".

Data shape (decided):

```ts
// src/lib/vaults.ts (pure where possible; fs reads injected or isolated)
export interface Vault { path: string; name: string }  // name = basename(path); this is what `vault=` takes
export function readRegistry(file = "~/Library/Application Support/obsidian/obsidian.json"): { cli: boolean; vaults: { path: string; open: boolean }[] }
export function vaultsWithQuickAdd(registry): Vault[]      // has .obsidian/plugins/quickadd/manifest.json and "quickadd" in community-plugins.json
export function sameNameConflict(vault, registry): boolean  // another registered vault shares the basename; the CLI and URIs address vaults by name, so refuse to run
export async function ensureVaultReady(vault, choiceId: string | undefined, deps): Promise<{ ok: true; opened: boolean } | { ok: false; message: string }>
```

Rules:
- Preference `vault` (free-text name, required) becomes `vaultPath` (`type: "directory"`, optional, "Leave empty to detect"). The extension is unreleased; no compatibility shim. Update `package.json`, README.
- Resolution order: preference path -> else exactly one QuickAdd vault -> else a vault picker `List` (name, path subtitle, warning tag on a same-name conflict) that pushes the choice list; Quicklinks embed `vaultPath` in their deeplink context; Quick Capture (no-view) needs a resolved vault and shows a failure toast telling the user to set the preference when several vaults qualify.
- `ensureVaultReady`: if the registry does not mark the vault open, or `obsidian vault=<name> vault info=path` does not answer with this path (normalize trailing slashes), run `open -g "obsidian://open?vault=<name>"` once, then poll every 500 ms up to 20 s until `vault info=path` matches and `quickadd:list` answers ok (and contains `choiceId` when given). Timeout -> `{ ok:false, message }`. `cli: false` in the registry -> `{ ok:false, message }` telling the user to enable Settings -> General -> Command line interface and restart Obsidian. Inject `open`, `runCli`, `sleep`, `now` so the state machine is unit-testable without Obsidian; test the open-once, the timeout, and the "already ready, nothing opened" paths.
- When `opened` is true the vault was brought up and Obsidian took focus. Bring Raycast back by opening this command's own deeplink (`createDeeplink({ command: "run-choice", context: { vaultPath, choiceId?, relaunched: true } })`) and return; the relaunched instance finds the vault ready. Guard against loops with the `relaunched` flag.
- `src/lib/obsidianCli.ts` and `src/lib/interactive.ts` stop reading the vault from preferences; they take a `Vault` argument. Thread it by prop; no module-level singleton.
- Keep the user's "Obsidian CLI Path" preference. Add `/Applications/Obsidian.app/Contents/MacOS/obsidian-cli` and `~/Applications/...` to the auto-detect candidates (it ships inside the app since Obsidian 1.12).

Tests: registry parsing, `vaultsWithQuickAdd` against a temp dir fixture, `sameNameConflict`, `ensureVaultReady` state machine with fakes.

## Live verification (mandatory, same surface rules as PR1)

- `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` green on both branches.
- Session: with the e2e vault's macro that calls `yesNoPrompt` after a long step, cancel while "Working..." and prove with the protocol script (or a `/poll` from a second client) that the server reports the run aborted; prove no `/abort` goes out after `done` by watching the fake server in the unit test and by the plugin's `interrupted:false` response if you abort after done manually.
- Vaults: close the e2e vault in Obsidian (the CLI has no close; use the vault switcher via `osascript` or ask: `obsidian vault=e2e-vault command id=app:close-window`? verify what works and report), run the Raycast command, screenshot that it opens the vault, relaunches, and lists choices. Screenshot the vault picker by temporarily setting the preference empty while two QuickAdd vaults are registered (the user's `notes` vault and `e2e-vault` both qualify; do not run anything in `notes`).
- Screenshots to `/tmp/pr2/<slug>.png`, inspected with the Read tool.

## Discipline

Delete before adding. No helper text under labels unless it prevents an error. Comments only for non-obvious why. No em dashes anywhere; use "-". `/deslop` before each commit, `/no-comments` before reporting. Do not open PRs. Report branch names, commit lists, test output tails, live evidence, and what you could not verify.

Principles to read and apply: `pstack:principle-model-the-domain` (one lifecycle state, one vault model), `pstack:principle-boundary-discipline` (parse the wire and the registry at the edge), `pstack:principle-make-operations-idempotent` (open once, poll to convergence), `pstack:principle-laziness-protocol`, `pstack:principle-prove-it-works`, `pstack:principle-test-behavior-not-implementation`, `pstack:typescript-best-practices`.

## Notes from PR1 (read before starting)

- `pnpm` via the vite-plus shim is blocked by safe-chain on this machine. Use `~/.vite-plus/package_manager/pnpm/10.32.1/pnpm/bin/pnpm` directly; that version produced the lockfile.
- The e2e vault is already registered and open in Obsidian as `e2e-vault` (path `<worktree>/e2e-vault` of the PR1 worktree, `/Users/christian/Developer/raycast-quickadd-wt/pr1-one-run-path/e2e-vault`). `open "obsidian://open?path=..."` did NOT register it; the delegate used `require("electron").ipcRenderer.sendSync("vault-open", ...)` through `obsidian vault=dev eval`. Your worktree has its own copy of `e2e-vault/`; either point Obsidian at it the same way, or keep using the PR1 worktree's vault for the Raycast runs and only edit `e2e-vault/` fixtures in your own worktree if the fixture needs a change. The vault's `data.json` choice ids are stable (`e2e-text`, `e2e-select`, `e2e-multi`, `e2e-custom`, `e2e-number`, `e2e-date`, `e2e-picker`, `e2e-runtime`, `e2e-template`, `e2e-macro`).
- `pnpm e2e:protocol` is the protocol-level check PR1 added; keep it green.
- The Raycast pixel check for PR1 could not run because the extension's vault preference points at the user's real `notes` vault and preferences are not scriptable. PR2c fixes this: once a deeplink can carry `vaultPath` in its context, the e2e vault is reachable without touching preferences. So after PR2c, also capture the PR1 screens (text form, select with custom field, multi TagPicker, number error, date with time, empty "Select..." note picker, inline Required error) through deeplinks with `context={"vaultPath": "<e2e vault path>", "choiceId": "<id>"}`.
- Keystroke safety: the PR1 delegate sent a keystroke while Raycast had already closed and it landed in the user's browser on a destructive dialog. Before EVERY `osascript ... keystroke`, check `osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'` equals `Raycast`; if not, do not send it, and report. Use deeplinks (`open "raycast://..."`) to open screens; only use keystrokes for submit (`cmd+return`) and Escape, and only with that guard. Never send keystrokes to any other app.
- `ray develop` replaces the user's installed dev build of this extension. When you finish, re-run `ray develop` briefly from `/Users/christian/Developer/raycast-quickadd` (main) so the installed build is main's again, and say you did.
