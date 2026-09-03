---
title: A failed check reported as a completed one that found nothing
date: 2026-09-02
last_updated: 2026-09-02
category: logic-errors
module: useFetchSite
problem_type: logic_error
component: service_object
symptoms:
  - 'A site with 8 Wayback snapshots reported "~5,000 snapshots" under an estimate label'
  - '"No snapshots available" shown for an archive the previous request had just proven non-empty'
  - '"Not found" shown for robots.txt when the request 5xx''d, timed out, or was refused'
  - '"No records found" shown for DNS when the resolver died partway through the six queries'
  - Every static gate stayed green for all four
root_cause: logic_error
resolution_type: code_fix
severity: high
framework_version: "@raycast/api 2.1.3"
related_components:
  - waybackUtils
  - dnsUtils
tags: [error-handling, fallback, fetch, abortsignal, dns, raycast]
---

# A failed check reported as a completed one that found nothing

## Problem

Four independent auxiliary lookups each converted "the check failed" into "the check
succeeded and found nothing." The user cannot tell these apart from the UI, and they
demand opposite responses: *absent* is an answer, *unavailable* is a reason to retry.
Each instance passed `tsc`, `ray build`, `ray lint`, and code review.

## Symptoms

- A precise-count timeout produced `snapshotCount = pageCount * 5000` — the formula
  meant for *large* archives — reporting a site with 8 snapshots as **5,000**, labelled
  an estimate rather than a failure.
- A non-2xx CDX response rendered "No snapshots available" for an archive whose page
  count had already proven non-empty.
- `robots.txt` / `llms.txt` / `sitemap.xml` read "Not found" on a 5xx, timeout, or
  refused connection.
- DNS reported "no records found" when the resolver failed on five of six queries.

## What Didn't Work

- **Reading the code for a `catch` that swallows.** Only one of the four was a literal
  `.catch(() => null)`. The others hid behind a plausible fallback value, an unchecked
  `Response`, and first-error bookkeeping — all of which *look* like handling.
- **Trusting the gates.** All four shipped or nearly shipped green. Types cannot
  distinguish a real count from a fabricated one; both are `number`.
- **Reasoning about the fallback in isolation.** `pageCount * 5000` was dismissed
  in-session as "degrading to an honest estimate." It is honest only on the branch it was
  written for; reused on the small-archive branch it is off by ~600x. An adversarial
  review caught this after the author had explicitly waved it off.

## Solution

Four fixes, one rule: **on failure, report the failure — never a value.**

**1. A fallback calibrated for one branch is wrong on another.** There is no honest
estimate for a small archive, so there is nothing to fall back *to*
(`/Users/messina/Developer/GitHub/chrismessina/raycast-digger/src/utils/waybackUtils.ts:194`
is the large-archive branch that legitimately keeps the formula):

```ts
} catch (preciseErr) {
  log.warn("wayback:precise-fetch-error", { /* … */ });
  throw preciseErr;   // was: snapshotCount = pageCount * 5000; isEstimate = true;
}
```

**2. `fetch` only rejects on transport errors.** A 429 or 500 is a resolved `Response`,
so a `try/catch` around it catches nothing and execution falls through to the
zero-value path
(`/Users/messina/Developer/GitHub/chrismessina/raycast-digger/src/utils/waybackUtils.ts:159`):

```ts
if (!preciseResponse.ok) {
  throw new Error(`Wayback precise-count request failed with HTTP ${preciseResponse.status}`);
}
```

**3. Filter errors at capture — and enumerate the BENIGN set, not the failure set.**
Six DNS queries run in fixed order and each can fail benignly (`ENODATA` for a record
type the host doesn't publish). Keeping "the first error" let a harmless A-record miss
mask a resolver that died on the five after it
(`/Users/messina/Developer/GitHub/chrismessina/raycast-digger/src/utils/dnsUtils.ts:36`):

```ts
const BENIGN = new Set(["ENODATA", "ENOTFOUND"]);
let resolverError: unknown;
const note = (e: unknown) => {
  const code = (e as NodeJS.ErrnoException | undefined)?.code;
  if (resolverError === undefined && (code === undefined || !BENIGN.has(code))) {
    resolverError = e;
  }
};
```

**The first attempt at this fix listed the failure codes instead** — a four-entry
`RESOLVER_FAILURE` allow-list — and that is the same defect wearing a fifth disguise.
Node surfaces 24 distinct DNS error codes; only 2 are benign. An allow-list of 4
therefore *discarded 18 of them*, including `EBADRESP`, `EFORMERR`, `ENOMEM`, and
`ECANCELLED`, returning `{}` to be rendered as "no records found." A reviewer caught it
one round after the original fix landed.

Filtering at capture also deleted the separate end-of-function code test — the correct
version is smaller than both buggy ones.

**4. Give the result three states, not two.** A boolean cannot hold the distinction, so
the type has to carry it: `ResourceStatus` is `"found" | "absent" | "unavailable"`,
classified by
`/Users/messina/Developer/GitHub/chrismessina/raycast-digger/src/hooks/useFetchSite.ts:172`.
(session history: introduced by the robots/llms/sitemap fix earlier in this same
release, whose witnessed test went 4/9 → 9/9 — the old boolean misclassified 500, 503,
403, and timeout as "absent".)

## Why This Works

Each fix removes a place where code *invented* information to fill a gap. The five
disguises the same defect wears:

| Disguise | Why it reads as correct |
| --- | --- |
| Plausible fallback value | the number has the right type and a hedging label |
| Unchecked `Response` | a `try/catch` is present; it just cannot see a 500 |
| First-error bookkeeping | an error *is* recorded — the wrong one |
| Two-state result type | no state exists to express "unknown" |
| Allow-list of failure codes | the list is present and looks deliberate; it is just short |

The two-state result type is the root of the rest: when a type cannot represent
"unknown," every site handling it must invent something, and a plausible invention is
indistinguishable from data. Three-state types are the structural fix; the others are
the same rule applied where a type change wasn't available.

## Prevention

- **Grep for the shape, not for `catch`.** These hide in fallback assignments:

  ```bash
  rg -n -B3 '^\s*(\w+)\s*=\s*.*(\*|\|\||\?\?)' --glob '*.ts' | rg -B3 'catch'
  rg -n 'await fetch' --glob '*.ts' -A6 | rg -v '\.ok|status' | rg 'await fetch'
  ```

- **Enumerate whichever set is closed, and let the open one fail closed.** "Which
  errors are real failures?" is unbounded and grows with the runtime; "which are benign?"
  is short and stable. Listing the failure codes is fail-open by construction — every
  code the author didn't think of is silently treated as success. Ask which of the two
  sets you could still enumerate correctly after a dependency upgrade.
- **A fallback belongs to the branch it was calibrated for.** Before reusing one in a
  sibling `catch`, state the input range it is valid over. `pageCount * 5000` is right
  for >10 pages and wrong for 1.
- **Any lookup rendered in a UI needs three states.** Adding `"unavailable"` costs one
  union member and a render branch; retrofitting it costs a cache-version bump, because
  entries persisted under the two-state shape outlive the fix.
- **Write the test for the mixed sequence, not the uniform one.** All-benign and
  all-failing both passed throughout; only `["ENODATA", "ESERVFAIL", …]` — benign
  first, real failure after — reproduced the DNS bug.
- **A comment claiming a guarantee is not the guarantee.** The DNS section carried a
  comment reading "say so here rather than letting every row below assert an absence we
  never established" — directly above six rows that went on asserting exactly that. The
  comment described the intent; nothing enforced it. When a comment states an invariant,
  find the line that makes it true or the comment is the only thing that is.
- **A fix for this class can reintroduce it.** Two of the five instances here were
  introduced *while fixing another one*. When the remedy is "detect the failure case,"
  check whether the detector is exhaustive or merely plausible before calling it done.
- **Static gates cannot see this class at all.** It needs a reviewer told to look for
  invented values specifically; a general "review this diff" pass returned clean on code
  that reported 5,000 for 8.

## Related Issues

- `/Users/messina/Developer/GitHub/chrismessina/raycast-digger/docs/solutions/logic-errors/abort-signal-conflates-self-cancel-and-supersede.md`
  — same module, same "green gates, wrong runtime behavior" shape, different cause
  (cancellation identity rather than error substitution).
- Shipped in the Digger release opened as raycast/extensions#30742 (draft at time of
  writing).
