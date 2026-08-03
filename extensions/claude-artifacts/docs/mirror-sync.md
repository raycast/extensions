# How this mirror stays in sync

This repo is a **standalone mirror** of the extension as published in
[`raycast/extensions`](https://github.com/raycast/extensions). It exists so all of
Chris's extensions live in one place and so people can file issues and PRs
against them individually.

That creates a two-way problem. The monorepo is authoritative for what ships to
the Store, but the mirror is where local work starts — and something has to
reconcile them without either side quietly winning.

## The rule

> The sync **never pushes to `main`**, and **never overwrites a file changed
> here**. Everything arrives as a pull request.

Merging that PR is the only thing that writes to `main`. There is no unattended
write path, which is what makes local edits structurally safe rather than safe
by remembering a rule.

## What broke before

The first version of
[`/Users/messina/Developer/GitHub/chrismessina/raycast-claude-artifacts/.github/workflows/sync-from-upstream.yml`](../.github/workflows/sync-from-upstream.yml)
downloaded every upstream file and committed it unconditionally:

```bash
curl ... -o "$path"      # overwrite, no comparison
git add -- "$path"
```

On 2026-08-01 that reverted a README fix — a dead `docs/shelf.md` link, fixed
locally but not yet shipped upstream — by restoring the monorepo's older copy.
The run reported success.

**The cron was not the bug.** Overwriting without comparing was. A
merge-triggered sync running that same code loses the same edit, just less
often, which is worse: rare corruption is the kind you stop watching for.

## How it decides now

Three-way compare per file, against `.github/upstream-sync-state.json` — the
upstream blob SHAs recorded at the last successful sync. Blob SHAs are
content-addressed, so "changed" is exact rather than heuristic.

| upstream changed? | mirror changed? | action |
| --- | --- | --- |
| no | no | nothing |
| **yes** | no | take upstream — the stamped CHANGELOG, recompressed PNGs, a contributor's merged fix |
| no | **yes** | **keep yours** — local work in flight |
| **yes** | **yes** | **stop.** Open an issue, sync nothing |

Row 3 is what used to lose. Row 4 is genuinely ambiguous and is never resolved
by a script — a conflicting run syncs *nothing*, so a partial state is never
committed.

When there is no baseline yet (first run) and a local file differs, it is kept.
The failure mode is biased toward preserving local work.

## Why the cron stays

The `repository_dispatch` trigger fires right after your own PR merges, so you
get the CHANGELOG stamp and optimized screenshots immediately instead of waiting
up to a day.

But a trigger only fires for merges you know about. The case that actually
causes silent drift is **someone else's PR to your extension merging upstream** —
you may not be the author and may never see it. So the daily cron stays as the
safety net. It is a no-op when nothing changed.

## Where local work goes

Branch → PR into this mirror → squash-merge to `main`. The sync then sees a
mirror-side change and preserves it.

Ship to the Store as usual (`ship`'s Route A). Once the Store PR merges, the
sync's next run sees upstream and mirror agree and does nothing.

## Contributors

When someone else's PR merges upstream, their **code** arrives via the sync PR
as a content snapshot attributed to the bot — not as their commits. Preserving
real authorship would need a subtree merge, which is heavier and much harder to
unwind when it goes wrong.

**Credit them in `CHANGELOG.md` before merging the sync PR.** That is where the
Raycast Store surfaces it, which is where users actually read it. The sync PR
body flags when it carries upstream changes so this is not easy to forget.

## If it goes wrong

- **Sync PR looks wrong** — close it. Nothing was written to `main`. Fix the
  cause and re-run the workflow.
- **Conflict issue opened** — reconcile the named files by hand, commit, re-run.
  No work was lost; the run stopped before touching anything.
- **State file drifted** — delete `.github/upstream-sync-state.json` and re-run.
  With no baseline the sync keeps every differing local file, so the worst case
  is that a genuine upstream change needs a manual pull.
