# Agent Guidelines for Digger

> Instructions for AI coding assistants working on this codebase.

Digger analyses a URL and reports what it found: metadata, discoverability files,
resources, headers, DNS and certificates, archive history, host metadata. One command,
one detail pane per section.

## Before Making Changes

- `CONCEPTS.md` — the vocabulary. *Dig*, *auxiliary lookup*, *supersession*, *resource
  status*, and *partial failure* have specific meanings here; the rest of this file uses
  them without redefining them.
- `docs/solutions/` — write-ups of problems already solved in this repo, filed by
  category with YAML frontmatter (`module`, `component`, `problem_type`, `tags`).
  Relevant when working in an area one of them covers. Both current entries are about
  `useFetchSite`, which is where the subtle bugs have lived.
- The existing code in the area you are changing.

## The mistake this codebase makes most: reporting a failed check as an empty one

Six separate times in one release, a check that **failed** was reported as a check that
**succeeded and found nothing** — "No snapshots available", "Not found", "No mail
servers found", "no records". Every instance passed `tsc`, `ray build`, and `ray lint`.
Read `docs/solutions/logic-errors/a-failed-check-reported-as-a-completed-empty-one.md`
before touching any lookup.

The rule: **on failure, report the failure — never a value.**

Three states, not two. *Found* / *absent* / *unavailable* — where *absent* is an answer
from the server and *unavailable* means the question never got one. A boolean cannot
express the third, so every site handling it invents something.

The status union is `ResourceStatus` in `src/types/index.ts`, and three different
mechanisms carry it, for three granularities:

- **The well-known text resources** (robots.txt, llms.txt, sitemap.xml) are classified by
  `classifyResourceResult` in `useFetchSite.ts`, which maps one settled request to one
  status.
- **The four auxiliary lookups** (DNS, certificate, Wayback, host metadata) report through
  `DiggerResult.lookups`, assigned inside `withAbort` — pessimistically `"unavailable"`
  before the promise settles, `"found"` only once it resolves.
- **A lookup made of independent probes** needs its own per-probe field; DNS uses
  `DNSData.unchecked`. Do not route a per-probe case through `classifyResourceResult` —
  it answers for one request, not six.

Specific traps, all of which have bitten:

- **`fetch` only rejects on transport errors.** A 429 or 500 is a resolved `Response`, so
  a `try/catch` around it catches nothing and execution falls through to the empty path.
  Check `response.ok` explicitly.
- **A fallback belongs to the branch it was calibrated for.** Reusing one in a sibling
  `catch` produced a report of 5,000 archive snapshots for a site that had 8.
- **Enumerate whichever set is closed.** "Which errors are benign?" is short and stable;
  "which are failures?" grows with the runtime. Listing failures is fail-open — every
  code you did not think of is silently treated as success.
- **A lookup made of independent probes needs a verdict per probe.** DNS is six queries
  and they disagree. One verdict hides every part that failed behind the parts that
  succeeded.
- **State that exists still has to reach the render path.** A section-level "Couldn't
  check" label above six rows that each still claimed an absence is not a fix.

## When correctness depends on remembering, the remembering is the defect

`DiggerResult` gained `wellKnown`, then `theme`, then `ThemeColor.hex`. Each needed a
matching bump of the cache key. It was forgotten all three times, and each time produced
the same failure: an entry cached under the old shape has no such field, the section
renders the missing field as an established absence — "None published", "No theme
declared", a swatch with no colour — and serves that for the whole 48h TTL. All three
passed `tsc`, `ray build` and `ray lint`, because a missing optional field is valid.

Adding a checklist item would have been the fourth chance to forget. The fix is that
**the cache version is computed for the case that kept biting**: `scripts/cache-schema.mjs`
hashes `src/types/index.ts` **and every file it transitively imports** — `WellKnownStatus`
lives in `wellKnownCatalog.ts`, so hashing the entry point alone would have missed a rename
there — into `CACHE_SCHEMA`. `CACHE.KEY_PREFIX` interpolates it, `prebuild`/`predev`
regenerate, `prelint` fails on a stale one. Comments are stripped by a scanner that
respects string literals, because a regex would truncate `type Url = "https://x"` at the
`//` and make two different URLs hash alike.

**Three gaps remain, and they are named rather than papered over:**

- **A semantic change with an unchanged shape.** Correcting a classifier to emit
  `"unavailable"` where it emitted `"absent"` touches no type, so the hash does not move.
  `CACHE.SALT` in `config.ts` is bumped by hand for those — a deliberate step for a case
  no derivation can detect.
- **`npx ray build` and `ray lint` bypass npm lifecycle hooks**, and Store CI runs the
  former. CI compiles whatever `cacheSchema.ts` was committed, so the gate that actually
  protects users is `npm run lint` before committing — not the build.
- **`ray develop` hot reloads do not regenerate.** `predev` runs once; add a cached field
  mid-session and the rebuild keeps the old hash. Restart `npm run dev` after editing a
  cached type.

So this is not "impossible to forget" — it removes the failure that occurred three times
and makes the residue explicit.

Two rules fall out of this, and they outlive the cache:

- **Derive the coupled value rather than duplicating it.** When edit A is only correct if
  someone also makes unrelated edit B, that pair is a latent defect however well it is
  documented. Compute B from A.
- **Where deriving is impossible, make the stale case unrepresentable at the point of
  use.** The same bug also reached the token merge, where cached hex-less tokens beat
  freshly computed ones because the name was already "seen". Preferring the token that
  actually resolved fixes it independently of any cache version — belt as well as braces,
  because the render path should not depend on the storage layer having been correct.

## Cancellation: ownership and supersession are different questions

`src/hooks/useFetchSite.ts` lets **one dig own the view at a time** — which is not the
same as one dig running at a time. A new dig aborts the old controller, and the main
fetch and the Wayback lookup take that signal, so they stop. DNS, TLS, and host metadata
take no signal and run to completion underneath; what the abort buys there is that their
results are discarded rather than rendered. Two predicates look interchangeable and are
not:

- `isSuperseded()` — was this dig's controller aborted? True when a newer dig replaced it,
  **and also** when this dig aborted itself after its own request failed. Gates the
  **progressive** output: progress bars and partial data.
- `ownsView()` — is this dig still the current one? False once a newer dig replaces it,
  but still **true** after a self-abort. Gates **failure reporting and the spinner**: the
  `fetchErrors` state write, the partial-failure toast, and clearing `isLoading`.

**The self-abort is the only case where they disagree**, and it is the case that bites.
There, `isSuperseded()` is true while `ownsView()` is still true. Guard failure reporting
with `isSuperseded()` and the error is dropped and the spinner runs forever — the dig that
failed silences itself. Guard progressive writes with `ownsView()` and a dig that has
already failed keeps painting partial data over its own error state.

Note the asymmetry inside `withAbort`: `lookupErrors[category]` is recorded
unconditionally, while only the React-state write next to it is gated by ownership. That
local record feeds this run's toast detail — it is **not** part of `DiggerResult`. What
survives into the cache is `lookups`, the per-category statuses, which is why a cached
partial failure still shows "Couldn't check" in each section but no longer has the
underlying error text. See
`docs/solutions/logic-errors/abort-signal-conflates-self-cancel-and-supersede.md`.

## Failure reporting is two-tier

Every failure reports **in place**, on the row it belongs to. Interrupting with a toast is
reserved for two cases: the main fetch failing, which ends the dig, and the loss of a whole
auxiliary subsystem — DNS, the certificate, Wayback, host metadata. A single unreachable file inside a section stays in that section: the reader
reviews sections one at a time, and a toast that fires for details is one they learn to
dismiss. The toast reads `lookups`; discoverability statuses deliberately do not feed it.

## Layout

```text
src/digger.tsx        the command — input resolution, then one List of sections
src/hooks/            useFetchSite (the whole pipeline), useCache
src/components/       one per detail section
src/actions/          ActionPanel contents, grouped by purpose
src/utils/            fetchers, parsers, per-lookup clients, config
src/types/            shared shapes; the status unions live here
scripts/              build-time codegen — see the cache-schema section above
```

## Commands and gates

```bash
npm run dev      # ray develop
npm run build    # ray build
npm run lint     # ray lint   (npm run fix-lint applies Prettier)
npx tsc --noEmit # NOT covered by build — esbuild strips types
```

`npx tsc --noEmit` is a separate gate. `ray build` and `ray lint` pass on code that does
not typecheck; run all three.

**Green gates are not a working feature.** They cannot see an empty state, a spinner, a
toast, or a resolved ActionPanel — which is where every defect in this codebase's history
has actually lived. Run `npm run dev` and walk the states before reporting done.

`ray develop` runs React in StrictMode, so effects fire twice on mount. Two identical
`fetch:start` lines in a dev log are that, not a dependency-array bug — but confirm the
doubling matches the mount replay before assuming, since a bad dependency array looks the
same in a log.

## Conventions

- Every `Toast.Style.Failure` gets a **Copy Error** action. A failure the user cannot
  copy is a failure they cannot report.
- Keyboard shortcuts use `Keyboard.Shortcut.Common` by semantics. Where no constant fits,
  give both `macOS` and `Windows` bindings — this extension declares both platforms, and
  a ⌘-only shortcut is unreachable on Windows. Check the whole resolved ActionPanel for
  collisions; `ray lint` does not.
- No `any`. No hand-defined `Preferences`/`Arguments` types — Raycast generates them.
- Use `@chrismessina/raycast-logger` for anything that makes a web request. It redacts
  automatically — every message goes through `redactString` and every argument through
  `sanitizeArgs` — so `?token=…`, `?api_key=…` and `Bearer …` are already masked wherever
  they appear, including inside logged objects. You do not need to pre-redact for those.
  **The log level decides whether you also strip the query yourself, and it is not a
  style choice.** `log.log` is gated by the Debug Logging preference: the user opted in,
  the query is often the very thing being diagnosed, and stripping it makes the line
  describe a different request than the one that ran. `log.warn` and `log.error` are
  **not** gated — they emit for a user who enabled nothing — so a whole user-supplied URL
  on those goes through `redactUrlForLog` (`src/utils/urlUtils.ts`), which keeps origin
  and path. Every current call site is a warn or an error; that is the rule, not an
  accident.
  The **Strict Redaction** preference (logger ≥ 1.5.0) raises the floor everywhere when
  the user turns it on — query and fragment masked to `?***` / `#***` across messages,
  structured values, Error stacks and property names, far past the hand-picked sites
  above. It does not replace `redactUrlForLog`, because it is off by default and the
  ungated sinks cannot depend on a preference the user has not set.
- Cached results carry their own failure statuses, so a cache hit still explains itself.
  If you add a lookup, its status has to live in the cached shape, not in component
  state. The cache VERSION takes care of itself — see the section above; do not hand-edit
  `CACHE.KEY_PREFIX` or `src/utils/cacheSchema.ts`.
