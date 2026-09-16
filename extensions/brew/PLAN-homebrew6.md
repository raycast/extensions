# Plan — target Homebrew 6 exclusively, and add cask pinning

Ground truth for every claim below: the installed Homebrew checkout at `/opt/homebrew`
(6.0.21, `f4854f506b`). Citations are to Ruby source or to a commit/tag in that checkout.

## Correction that changes the framing

**Cask pinning is not a Homebrew 6 feature.** `7a078066` "Support pinning casks" (2026-05-15) is
contained in **5.1.12** — `git -C /opt/homebrew describe --tags --contains 7a078066` → `5.1.12~39^2`.
Dropping 5.x is therefore *not* what unlocks it, and the shipped
`/Users/messina/Developer/GitHub/chrismessina/brew/CHANGELOG.md:9` claim that it "waits on Homebrew
6's `brew pin --cask`" is wrong. The two work items are independent; they are bundled here only
because they touch the same files.

---

## Phase 1 — drop 5.x

### 1.1 Delete the `useInternalApi` preference (P1 — this one is not cosmetic)

`/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/commands.ts:96-101` sets
`HOMEBREW_USE_INTERNAL_API=1`. In 6 that var is the default *and* deprecated
(`/opt/homebrew/Library/Homebrew/env_config.rb:763-768`; made default `745385a90a`, deprecated
`53b7d9e2d8`, both first in tag 6.0.0).

The warning is normally stderr-only and harmless. It is **not** harmless for one class of user:
`/opt/homebrew/Library/Homebrew/utils/output.rb:242` raises `MethodDeprecatedError` instead of
warning when `disable_for_developers` is true (default, `output.rb:178`) and the user has
`HOMEBREW_DEVELOPER` set. `execBrewEnv` copies `process.env` (`commands.ts:82`), so
`HOMEBREW_DEVELOPER` is inherited.

**Scope, stated precisely:** this hits the Ruby commands that load the API — the ones that read the
deprecated variable (`/opt/homebrew/Library/Homebrew/api.rb:222-224`). It does **not** hit every brew
call: `brew update`, which the extension runs at
`/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/fetch.ts:473`, takes Homebrew's
shell path (`/opt/homebrew/Library/Homebrew/brew.sh:661-689`) and never enters `brew.rb`. An earlier
draft of this plan said "every brew call the extension issues"; that was wrong. The remedy is
unchanged — a developer-mode user who ticks this preference has a broken extension.

- Remove the env write (`commands.ts:96-101`) and its log field (`commands.ts:109`).
- Remove the preference from `/Users/messina/Developer/GitHub/chrismessina/brew/package.json`.
- Keep `disableDownloadConcurrency` — `HOMEBREW_DOWNLOAD_CONCURRENCY` is alive and undeprecated
  (`env_config.rb:326-332`). Only its "Homebrew 5.0 Options" section title changes.

### 1.2 Retire the stale 5.0 copy

`commands.ts:1-11` ("Homebrew 5.0 Compatibility Notes") and the `"Homebrew 5.0 Configuration"` log
label at `commands.ts:103-111`; same treatment in
`/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/upgrade.ts:8,85,119,189`.

Also correct — not delete — the comment at `commands.ts:86` claiming "Brew will ignore custom
environment variables" of `HOMEBREW_BROWSER`. It does not ignore it: `exec_browser` does
`safe_system(browser, *args)` (`/opt/homebrew/Library/Homebrew/extend/kernel.rb:127-137`), so the
bundle id would be exec'd by any command that opens a URL. We never call one, which is why this is
safe today — the comment should say that, since it is the reason.

### 1.3 Docs

`README.md:9,18` and `CHANGELOG.md:9`. The README's "still works on 5.x" line goes; the cask-pinning
line needs the 5.1.12 correction regardless of which floor we document.

---

## Phase 2 — defects the audit exposed (independent of 6)

### 2.1 `installed_as_dependency` does not exist — a badge silently never renders

Removed by `916f6a1711` ("use installed_on_request as source of truth"), first in **5.1.9**;
`/opt/homebrew/Library/Homebrew/tab.rb:61-62` calls it "the long-removed
`installed_as_dependency`". Live key set from `brew info --json=v2 --installed` confirms its absence.

- `/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/types.ts:74` declares it **required**.
- `/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/helpers.ts:206` and
  `/Users/messina/Developer/GitHub/chrismessina/brew/src/components/packageMetadata.tsx:73` branch on
  it, so the **"D" badge never renders** on the `brew info` path.
- A second, unused loader (`brewFetchInstalledFast`, the 5.0-era two-phase fast path) synthesized it
  correctly as `!installed_on_request`, so the two loaders disagreed. That path had no caller and has
  since been deleted along with its helpers.

Other producers to trace before deleting the field: the optimistic post-action updates in
`/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/actions.ts:18-31` and `:39-56` also
construct installed entries, so they must not be left synthesizing a field the type no longer has.

Fix: derive from `installed_on_request` in one place; drop the field from the type.

**This is user-visible: the "D" badge starts appearing where it never has.** Needs eyes, not a test.

### 2.2 `linked_key` is a typo for `linked_keg`

`types.ts:67` and the cache allowlist at
`/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/cache.ts:166` both misspell it;
Homebrew emits `linked_keg` (`/opt/homebrew/Library/Homebrew/formula.rb:3085`). The allowlist drops
the real field and the typed field is permanently `""`. Nothing reads it — cosmetic, but the type
lies. Pre-existing, not a 6 change.

### 2.3 `pin`/`unpin` argv is ambiguous

`/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/actions.ts:136,146` emit bare
`pin <name>`. Since `/opt/homebrew/Library/Homebrew/cmd/pin.rb:28` is
`named_args [:installed_formula, :installed_cask]`, a token installed as both now resolves
ambiguously. Must pass an explicit `--formula` / `--cask`. Phase 3 subsumes this.

---

## Phase 3 — cask pinning

### CLI surface (from `cmd/pin.rb:21-28`, `cmd/unpin.rb:17-24`)

`brew pin --cask <token>` / `brew unpin --cask <token>`. `--formula`/`--cask` are `conflicts`, so
always pass exactly one. Already-pinned → `opoo`, exit 0. Not installed → `ofail`, exit 1.

**A pinned cask with `auto_updates true` succeeds with a warning** — brew notes it may still update
itself. It does not refuse (`pin.rb:35-47`).

### Pin state is reported, and the model we already have fits

- `brew info --json=v2` gives casks **both** `pinned` and `pinned_version`
  (`/opt/homebrew/Library/Homebrew/cask/cask.rb:562-564`). Asymmetry: formulae get `pinned` but not
  `pinned_version` there (`formula.rb:3086`). Both kinds get both in `outdated --json=v2`.
- `brew outdated --json=v2` **includes and marks** pinned casks, never excludes them
  (`cmd/outdated.rb:211-215` → `cask.rb:461-468`); `Cask#outdated_version` never consults `pinned?`.
  Formulae behave identically (`outdated.rb:96-116`).

So `/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/upgrade-selection.ts` needs no
restructuring — casks just start carrying real values.

- `brew upgrade` skips pinned casks symmetrically with formulae (`cask/upgrade.rb:82-90` vs
  `cmd/upgrade.rb:428-429,472-480`): `ofail`/exit 1 when named explicitly, `opoo`/exit 0 on a bare
  upgrade.

### The batch upgrader will report pinned casks as FAILED — must fix

Homebrew's symmetry does **not** save us, because we never issue a bare `brew upgrade`. We name every
package explicitly (`upgrade ${pkg.isCask ? "--cask " : ""}${pkg.name}`,
`/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/upgrade.ts:237`) — exactly the case
Homebrew turns into `ofail` + exit 1.

And the pinned filter is formula-only today
(`/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/upgrade.ts:152-159`):
`outdated.casks.map(...)` passes every cask through with no `pinned` check. The non-zero exit lands in
the `catch` at `upgrade.ts:248-261` and is recorded as **`failed`**, not `skipped` — a user-visible
error for a package we deliberately declined to touch. The Upgrade command
(`/Users/messina/Developer/GitHub/chrismessina/brew/src/upgrade.tsx:33-37`) drives this engine.

Fix: filter pinned casks into the same `pinned`/`skipped` bucket as formulae at `upgrade.ts:152-159`.
An earlier draft of this plan claimed our behaviour "transfers unchanged" and omitted `upgrade.ts`
from the file table entirely. That was the plan's most serious hole.

### The cache bug this will hit

Pins are symlinks under `HOMEBREW_PREFIX/var/homebrew/pinned_casks`
(`/opt/homebrew/Library/Homebrew/startup/config.rb:57`), a **separate directory** from formulae's
`pinned` (`:54`), and `unpin` `rmdir_if_possible`s it, so it does not exist when nothing is pinned.

`/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/fetch.ts:342-350` watches `pinned`
and the parent `var/homebrew`. The parent check saves the *first* cask pin (creating the directory
bumps the parent mtime) but **not** subsequent pins/unpins while it exists — stale pin state in the
UI. Add a `pinned_casks` mtime probe alongside the existing one.

### Behaviours that need an owner, not just a note

- **Uninstalling a pinned cask fails** (`cask/uninstall.rb:38-48`) and
  `/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/actions.ts:64-72` passes no
  `--force`, so today it surfaces as a raw brew error. Owner: the uninstall action
  (`/Users/messina/Developer/GitHub/chrismessina/brew/src/components/actions.tsx:256-279`). Decide
  between a pre-check that offers to unpin, or letting brew's message through. **Do not silently pass
  `--force`** — that auto-unpins and removes a lock the user set deliberately.
- **Pinning an `auto_updates` cask** warns that the pin may not hold (`cmd/pin.rb:35-45`). Owner: the
  pin action. Either surface the warning or pin silently — see the open questions at the end.

### Other pinned-cask refusals we must handle

- **Uninstall**: `cask/uninstall.rb:38-49` — "is pinned. You must unpin it to uninstall.", unless
  `--force`, which auto-unpins. `/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/actions.ts:71`
  (`rm --cask`) will fail on a pinned cask today.
- **Reinstall**: `cmd/reinstall.rb:160` refuses identically — noted for completeness only. The
  extension has no reinstall flow (no `reinstall` invocation in
  `/Users/messina/Developer/GitHub/chrismessina/brew/src/utils/brew/actions.ts`), so nothing to build.

### Surface

| File | Change |
|---|---|
| `src/utils/types.ts:42-52`, `:98-105` | add `pinned` / `pinned_version` to `Cask` and `OutdatedCask` |
| `src/utils/brew/actions.ts:132-149` | generalise pin/unpin via existing `brewCaskOption` (`helpers.ts:112`); explicit `--formula` otherwise |
| `src/components/actions.tsx:97-104` | delete `isPinned`'s formula-only guard and its (now inverted) docblock |
| `src/components/actions.tsx:128-144,256-280` | pin actions accept `Cask` |
| `src/outdated.tsx:92-93,179,200,335-344` | map `c.pinned`; drop `!isCask` guards on icon and action |
| `src/utils/brew/fetch.ts:342-350` | watch `pinned_casks` |
| `src/utils/brew/helpers.ts:186-196` | `caskFormatVersion` has no `P` badge; `formulaFormatVersion:209` does |
| `src/utils/installed.ts:18-22` | pinned-cask visibility split |
| `src/utils/brew/upgrade.ts:152-159` | **exclude pinned casks from the batch run** (see above) |
| `src/hooks/useBrewSearch.ts:449-457` | copy `pinned` in the cask branch of `applyInstalledStatus` |
| `src/components/actionPanels.tsx:157-209`, `:344-358` | the cask action panels — without these, Pin/Unpin is unreachable from Search and Show Installed |
| `src/components/list.tsx:103-144`, `:246-282` | shared list renderer: pin accessory + action wiring for casks |
| `src/components/outdatedList.tsx:87-97`, `:200-235` | **owns the pinned section and its ordering** — the `outdated.tsx` edits above cannot change grouping by themselves |
| `src/installed.tsx:22-43` | pinned grouping on the installed side |
| `src/utils/upgrade-selection.test.ts` | add the pinned-cask selection case (fixtures already carry cask JSON, `:53-68`, `:136-144`, `:289-308`) |

**Search can show cask pin state after all.** The web API carries no local state
(`cask.rb:855-861` grafts it on afterwards), but we already join installed state onto search results in
`applyInstalledStatus`
(`/Users/messina/Developer/GitHub/chrismessina/brew/src/hooks/useBrewSearch.ts:431-458`) — the formula
branch copies `pinned`, the cask branch simply omits it. One line, same as formulae. An earlier draft
of this plan asserted the opposite.

---

## Phase 4 — deliberately NOT doing now

- **`brew list --versions --json`** (5.1.13, `36acefd02c`) would collapse two `execBrew` calls and
  hand the fast path pin state. But it exists **only** in `list.sh` and **requires `jq`** — the Ruby
  path raises `UsageError` unconditionally (`cmd/list.rb:95-98`). Without `jq` it is not a silent
  degradation: `list.sh:78-98` searches `PATH`, `HOMEBREW_PATH`, `opt/jq/bin/jq` and `bin/jq`, then
  prints `Error: jq is required for brew list --versions --json.` and exits 1. Cleanly detectable, but
  still a hard `jq` dependency for one saved subprocess. Not worth it.
- **`brew update-if-needed`** replacing the unconditional `brew update` at `fetch.ts:473-477`. A real
  win, available since 4.4.27 — unrelated to this work, own change.
- `brew exec`, `info --sizes`, the Binaries section (text-only, `--verbose`-gated, no JSON —
  `cmd/info.rb:606-620`), `--greedy-latest`/`--greedy-auto-updates`, `HOMEBREW_UPGRADE_GREEDY_CASKS`.

## Deadlines

**None.** No `odeprecated`/`odisabled` call anywhere in `Library/Homebrew` passes `disable_on:`.
Nothing we use is scheduled for removal. Do not adopt: `outdated --json=v1` (hard `odie` since 3.0.0,
though `outdated.rb:26-29` help text still wrongly calls v1 the default), `install --env`,
`--variations` (raises under the now-default internal API, `formula.rb:3140-3142`).

Note the opposite defaults: bare `brew info --json` ≡ v1, bare `brew outdated --json` ≡ v2. We always
pass `--json=v2` explicitly; keep doing that. No v3 exists in 6.0.21.

---

## Open questions for Chris

1. **Pinned casks in Show Upgrades** — identical "unpin to include" affordance as pinned formulae, or
   different treatment?
2. **`auto_updates` casks** — surface brew's "the pin may not hold" warning when pinning one, or pin
   silently?
3. **Uninstalling a pinned cask** — offer to unpin, or let brew's refusal message through?
