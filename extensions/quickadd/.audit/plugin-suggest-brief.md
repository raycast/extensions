# Plugin brief: `quickadd:suggest` CLI handler

Repo: `/Users/christian/Developer/quickadd` (QuickAdd, Obsidian plugin, pnpm, master). Read `AGENTS.md` first and follow it. Work in your own worktree under `/Users/christian/Developer/quickadd-worktrees/` on a branch `feat/cli-suggest` off `master`. Use `gh issue develop` only if you create an issue; you need not.

## Why

Raycast (and any other front end driving QuickAdd through the CLI) wants to offer `[[` link completion and `#` tag completion inside text fields, exactly as Obsidian's editor does. A third-party extension currently approximates this by calling the generic `obsidian-cli files` / `aliases` / `tags` commands and re-implementing Obsidian's ignore filters and unsupported-file setting in its own code. That drifts from Obsidian. QuickAdd can hand out Obsidian's own suggestion list instead, so the front end never re-implements the rules.

## Contract

Register one new CLI command next to the existing ones in `src/cli/registerQuickAddCliHandlers.ts`:

```
quickadd:suggest kind=<links|tags>
```

Response envelope follows the others (`{ ok, command, ... }`, errors as `{ ok:false, error }`).

- `kind=links` -> `{ ok: true, kind: "links", items: [{ text, path, alias? }] }`. One item per thing Obsidian's own `[[` suggester would offer: every linkable file and every alias. `text` is what goes inside `[[...]]` (the alias, else the shortest unambiguous link text Obsidian would insert, i.e. basename without extension, or the path when the basename is ambiguous). `path` is the vault path of the target file. `alias` is set only for alias entries. Order: Obsidian's own order if the API provides one, else most recently modified first.
- `kind=tags` -> `{ ok: true, kind: "tags", items: [{ tag, count }] }` with `tag` without the leading `#`, sorted by count descending then name. Source: `app.metadataCache.getTags()` (QuickAdd already uses it in `src/gui/suggesters/TagIndex.ts`; reuse that index or its normalizer rather than a new one).
- Missing or unknown `kind` -> `{ ok: false, error: "kind must be links or tags" }`.

For links, prefer Obsidian's own list: `app.metadataCache.getLinkSuggestions()` (undocumented but long-stable, returns `{ file?: TFile, path: string, alias?: string }` entries that honor the vault's excluded-files filter and the "detect all file extensions" setting). Verify its real shape at runtime first (see verification) and type it narrowly behind a small adapter interface so tests can stub it (AGENTS.md testing rule). If the method is absent at runtime, return `{ ok:false, error }` saying the Obsidian version is too old; do not silently fall back to a hand-rolled walk. Alternative if `getLinkSuggestions` turns out unusable: QuickAdd's own `FileIndex` in `src/gui/suggesters/FileIndex.ts`, which already feeds the plugin's file suggester. Say which one you used and why in the report.

Also add the command's flags to `src/cli/params.ts` in the same style as `LIST_FLAGS`, and a one-line entry wherever the CLI commands are documented for users (search `docs/` for `quickadd:list` and add `quickadd:suggest` beside it, same format).

## Tests

Unit tests under the existing co-located pattern (`src/cli/suggestCli.test.ts` or similar) that stub the adapter and assert: alias entries carry `alias`, ambiguous basenames use the path as `text`, tags drop the `#` and sort by count, unknown kind errors. Tests must fail on a real defect (no tautologies). `pnpm run test`, `pnpm run lint`, `pnpm run build` green. Keep `main.js` / `styles.css` regenerated in the same commit as the source change per AGENTS.md (run `pnpm run build`).

## Live verification (mandatory)

Follow the `verify-in-obsidian` skill. Use the isolated worktree flow (`pnpm run start:e2e-obsidian`, `pnpm run obsidian:e2e -- ...`). Before implementing, probe the API shape with `pnpm run obsidian:e2e -- eval code='JSON.stringify(app.metadataCache.getLinkSuggestions().slice(0,5))'`. After implementing, prove `pnpm run obsidian:e2e -- quickadd:suggest kind=links` and `kind=tags` return the documented shapes against a vault with at least one alias, one note whose basename collides with another in a different folder, and one tagged note. Paste the real output (trimmed) in your report.

## Scope discipline

Small change. No query filtering, no pagination, no caching: the front end filters. No changes to the interactive server or protocol. Do not open a PR; commit on the branch with Conventional Commit titles (`feat(cli): add quickadd:suggest for link and tag completion`) and report the branch, commits, test output, and the live CLI output. No em dashes in any text (user rule); use "-". Run `/deslop` before committing.

Principles to read and apply: `pstack:principle-boundary-discipline`, `pstack:principle-laziness-protocol`, `pstack:principle-prove-it-works`, `pstack:principle-test-behavior-not-implementation`, `pstack:typescript-best-practices`.
