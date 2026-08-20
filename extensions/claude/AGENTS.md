# Claude — extension notes

Orientation for anyone (human or agent) changing this extension. It covers where the code came from, where it deliberately diverges from that origin, and what to do when an update goes wrong for a user.

Most extensions in this monorepo carry no such file, and this one does so deliberately: it is the Claude extension, most of its recent work was done with an agent, and the migration below has invariants that are easy to remove without anything failing.

## Lineage

This extension is a **fork of the ChatGPT Raycast extension**, not an independent build. That origin explains most of what looks odd here. The comparisons below were true of upstream at the time of writing and are not re-checked by anything — verify before relying on one.

The upstream extension still declares the five commands this one inherited, under identical names *and* identical titles — `ask` / Ask Question, `saved` / Saved Answers, `history` / History, `conversation` / Conversations, `model` / Models — alongside five it has added since (summarize, two image commands, and two AI-command commands) that were never forked. The Conversations-vs-History split, the storage shape, and the hook structure were all inherited wholesale and never designed for Claude.

For roughly two years the fork was maintained as a model-list updater. Of 25 changelog bullets at the fork point, 11 concern the model list, and the handful that touch how the commands behave are all small fixes — *"History now saves as expected"*, *"Removed duplicate history entries that were being created when streaming was enabled"*, *"Restarting a conversation will retain the currently selected model"*, a de-duplicated Copy Question action, and a stream-cleanup fix. No bullet reconsiders the command set.

So the divergence runs both ways. Upstream grew; this fork did not track it. Nothing here is a port of upstream's later work, and upstream is not a reference for how this extension should behave.

Two structural problems drove the rework:

1. **No shared state authority.** Each storage hook was a per-mount `useState` plus a hand-rolled `LocalStorage` read/write, so a conversation written by Ask was invisible to an open list command.
2. **Three commands held one dataset.** History (flat Q&A), Conversations (grouped threads), and Saved Answers (starred Q&A) were three keys over the same data with no consistency contract between them.

## Divergence from the upstream extension

### Commands

| Upstream | Here | Note |
|---|---|---|
| `ask` — Ask Question | `ask` — Ask Question | kept |
| `model` — Models | `model` — **Presets** | retitled only; the command `name` is deliberately unchanged |
| `conversation` — Conversations | — | folded into Recents |
| `history` — History | — | folded into Recents |
| `saved` — Saved Answers | — | folded into Recents; starring became a pin flag |
| — | `recents` — **Recents** | one list, filterable by Active / Archived / All |

Changing a command's `title` while holding its `name` fixed is the intended pattern for any future rename: the `name` is the manifest identifier a user's hotkey or Quicklink is bound to, and the `title` is only copy. (The compatibility benefit is the *intent* behind keeping `name: model` — it is not something this repo can verify on its own.)

`history` and `saved` are removed outright rather than kept as thin commands opening Recents pre-filtered. The cost was accepted knowingly: a hotkey or Quicklink bound to either stops working with no in-product signal, which is why that removal leads the changelog. `saved` in particular had no filter to open Recents *with* — the Status dropdown is Active/Archived/All, and pinning is not a status.

### Naming policy

These are this extension's naming decisions, recorded as rationale rather than as claims about anyone's current product:

- "Conversations" was inherited from the ChatGPT fork, not taken from the Anthropic API — the API's only concept here is `messages[]`.
- The merged command is called **Recents** to match what Claude's own apps call the equivalent list, rather than Chats or History.
- Presets are called **Presets**, not Agents, because they are model + prompt + limits with no tools and no autonomy.

See `CONCEPTS.md` for the vocabulary these docs assume (Conversation, Turn, Recents, Preset, Model, Retirement, Write admission).

### Other deliberate departures

- **Presets are YAML** on export/import, because a preset is mostly one long multi-line system prompt and JSON renders that as a single unreadable line of `\n` escapes. Raycast Agent interop uses JSON, because that format is not ours to choose.
- **Sampling parameters are conditional.** `temperature` is a hard 400 on Claude Opus 4.7 and later, so it is only sent where supported.
- **Requests are bounded to the model's input budget** rather than sending the whole transcript every time. The full transcript is still displayed; only the request is trimmed.

## Storage

| Key | Holds |
|---|---|
| `recents_v1` | every Conversation — the source of truth |
| `recents_v1_generation` | write counter, bumped by writers going through `withGenerationBump` |
| `recents_legacy_retired_v1` | marker recording that the migration wrote and verified a payload |
| `models` | saved Presets |
| `presets_seeded_v1` | guard so default Presets seed exactly once |
| `available_models_cache_v2` | last successful `/v1/models` response; the unversioned predecessor is deleted on the next successful write |
| `recents_status_filter` | the Recents Status dropdown's last value |

Legacy keys — `conversations`, `history`, `savedChats` — are migrated into `recents_v1` and then deleted. Names live in `src/stores/recentsKeys.ts`; the migration is `src/stores/recentsMigration.ts`; the deletion is `src/stores/recentsRetirement.ts`.

**The migration runs when Recents mounts — not at launch.** A user who only opens Ask can accumulate fresh `recents_v1` rows while legacy data sits unmigrated. Migration runs on *every* Recents mount, unconditionally; it does not consult the retirement marker to decide whether to run. `isRetirementComplete` exists but has no runtime caller.

A three-way join, not two: every answer was historically written to its conversation, to `history`, *and* — if saved — to `savedChats`. The migration reconciles all three so an answer that exists in several places appears once, and a saved answer's timestamp becomes the pin rather than spawning a duplicate row.

### What retirement does and does not guarantee

Retiring the legacy keys is the only **automatic** destructive step. It is not the only destructive one: Delete and Delete All are user-initiated and equally permanent, and **Delete All also removes every `__corrupt_` rescue copy** — so it destroys the safety net described below.

Three properties bound the risk. Read them precisely, because two of them are weaker than the code's own comments suggest:

1. **Copy, verify, then delete — enforced by the compiler for the payload, by convention for the rescue list.** The migration writes `recents_v1`, reads it back, and only then calls `retireLegacyKeys`. Its first parameter is a `VerifiedPayload`, a branded `string` whose brand is a non-exported `unique symbol`, so `retireLegacyKeys("anything", 0, [])` no longer typechecks. The only mint is `verifyPayloadRoundTrip(written, readBack)`, which throws unless the two are identical — a caller cannot claim verification, only demonstrate it. The same construction as `MigrationVerifiedToken` in `src/stores/recentsDelete.ts`. **The third parameter, `rescuedSideKeys`, is NOT branded** — `[]` typechecks — because its mint would have to live in `recentsMigration.ts` and importing retirement from there reintroduces the cycle `recentsKeys.ts` exists to break. One call site holds that half of the invariant.
2. **Data that cannot be fully understood is rescued, never discarded.** Any legacy value the migration cannot fully parse — unparseable bytes, valid JSON of the wrong shape, or an array containing malformed rows — is copied to a `<key>__corrupt_<ISO-timestamp>` side-key before anything is repaired or deleted.
3. **Retirement is repeatable, not a one-shot switch.** An older build running alongside only ever adds to the legacy keys. Because migration re-runs on every Recents mount regardless of the marker, those writes get folded in and retired on the next mount.

**There is a documented residual race**, stated honestly at `src/stores/recentsMigration.ts:41-53` and not closed: `LocalStorage` offers no compare-and-swap, so between the migration's final generation re-read and its `setItem` there is a one-await window in which a concurrent write can be overwritten. A concurrent *delete* landing in that window is the genuinely lossy case. Do not describe this area as race-free.

**The retirement marker proves less than its name suggests.** It is written *before* the deletes and records only a row count, a payload hash, and a timestamp. It therefore attests that the migration verified a payload — not that the legacy keys were successfully removed. A marker can coexist with legacy keys after a crash, a failed delete, or an old build re-creating them.

`RECENTS_OWNED_FIELDS` in `src/stores/recentsMigration.ts` names the fields that belong to Recents alone (`archived`, `title`). A user-set field that is *not* listed there will be re-derived from legacy data on a later pass and the user's edit will silently revert. Pin state is **not** in that list — it is reconciled separately by timestamp in `resolvePinState`.

## If an update breaks something

The path depends on whether Recents renders anything, because the export action is only reachable when it does.

**Before anything else: do not use Delete or Delete All while investigating.** Delete All removes the `__corrupt_` rescue copies, which may be the only surviving form of the user's data.

**If Recents loads and shows conversations:** export immediately. Recents → **Export History to JSON** (⌘⇧E) writes `~/Downloads/claude-history-<timestamp>.json` containing every conversation regardless of the Status filter, built from the in-memory store rather than the filtered view. No API key or preferences are written into the file. It is a readable archive, not a restore button — there is no import yet.

**If Recents is empty:** the empty state offers **Export Stored Data to JSON** on the same ⌘⇧E, which writes the extension's entire `LocalStorage` — `recents_v1`, any surviving legacy key, and every `<key>__corrupt_<ISO>` rescue copy — to `~/Downloads/claude-storage-<timestamp>.json`. This is deliberately a different action from Export History: the history export reads the in-memory list, so it has nothing to write in exactly the situation the user most needs it. Keys matching `apiKey`/`token`/`secret` are excluded; the API key lives in Raycast's preference store and is not in this file. Recovery is by hand from that JSON — there is no import.

Then work through, in order:

1. **Are the legacy keys still present?** If so, the source data is still there and retirement did not complete — which is recoverable.
2. **Are there `<key>__corrupt_<ISO>` keys?** Their presence means some legacy value could not be fully understood and was preserved verbatim rather than dropped. That raw text is recoverable by hand.
3. **What does `recents_legacy_retired_v1` say?** Treat it as evidence the migration verified a payload, not as proof the deletes ran. Compare its row count against what the user actually sees.

**If a user edit reverts on relaunch,** the field is being re-derived rather than preserved. For archive or rename, check that the field is in `RECENTS_OWNED_FIELDS`. For pin or unpin, that array is the wrong place to look — pin state is resolved by `resolvePinState` comparing `pinned_at` against `unpinned_at`, so a reverting unpin is a bug in that comparison.

**If a preset is stuck at a 4,096-token ceiling,** only the built-in default is re-pointed automatically, and only while the user has not edited it (`computeRepointedDefault`). A preset the user created keeps whatever ceiling it was saved with, deliberately — that value may be a choice, not a leftover. Raise it in the Presets form.

**If requests fail on a current model,** check that `temperature` is not sent unconditionally and that non-streaming `max_tokens` is clamped. Both are handled in `src/utils/models.ts` through a single builder the streaming and non-streaming paths share; they were duplicated once, and the copy that got missed 400'd every request for users with streaming disabled.

## Working on this extension

All three gates, before any Store submission — `ray build` and `ray lint` both pass on code that does not typecheck:

```
npx tsc --noEmit && npx ray build -e dist && npx ray lint
```

**This extension ships no tests and no test script**, so anything you write to check your work is a scratch file nobody reviews and CI never runs. Two consequences: the three gates above are the only automated signal, and a check that asserts against a constant this repo also owns proves nothing — assert against the dependency whose behavior you are actually relying on.

`docs/DESIGN-NOTES.md` covers design decisions in more depth than this file.
