# 11 — What "done" looks like for the build session

Parent: [map.md](../map.md)
Type: grilling
Status: resolved 2026-07-27
Blocked by: 04, 05

## Question

The spec hands a build session network-dependent code with no obvious test seam. What does the implementer run to know they are finished, and what does the spec commit them to?

Decide:

- **Where the seam goes.** Both network calls are now fixed shapes — a `cdn-cgi/trace` text block and an ipwho.is JSON body. Is parsing separated from fetching so the parse is testable against captured fixtures, or is a manual `npm run dev` pass the whole story?
- **Which cases must be proven, not just coded.** The failure taxonomy is unusually rich for an extension this small: 04's three trace states (OK / blocked / unreachable) times 05's two geo states (OK / degraded), plus `success:false` on a 200 — the exact trap the sibling extension falls into.
- **How the degraded path gets exercised at all.** It cannot be triggered on demand against a live provider that answers 30/30. Fixture, injected failure, or unverified-by-design?
- **Whether a test runner enters the project.** No published sibling in the corpus ships tests; adding one is a dependency, a config, and a CI question the spec would be imposing on the build session.
- **What the implementer is asked to observe by hand**, given 17's rule that UI is not verified by compiling: which states must actually be seen rendered in Raycast before the work is called done.

## Notes carried in from 04 and 05 (graduated fog)

- The fetch/parse shape is now fully pinned, which is what this ticket was waiting on: two serial calls, a two-phase progressive render, and a degrade path that blends the trace's `loc=` with a partial marker.
- **The `success`-boolean branch is the highest-value thing a test could pin.** ipwho.is returns HTTP 200 with `{"success":false}` for a reserved-range IP; `if (!response.ok) throw` passes it and renders `undefined`. A single captured fixture proves the guard.
- The `h=claude.ai` validation from 04 has the same shape — a body that parses fine but must be rejected. Also fixture-sized.
- 02's research recorded that ipwho.is's over-quota response was never triggered and its shape is an assumption, not a measurement. If verification wants that path covered, it is covered against an invented fixture — worth saying out loud in the spec.
- Whatever is decided here constrains [10](10-write-spec.md), which must write it down as the build session's acceptance criteria.

## Notes carried in from 08

[08](08-refresh-and-caching.md) closed the fetch lifecycle and added four behaviours to your "which cases must be proven" list. All four are **invisible to a static screenshot** — they are about ordering and transitions, so they cannot be verified the way the six card states can:

1. **Refresh with an unchanged IP holds the location line.** No flicker, no drop to `ip-only`, geo swaps in underneath.
2. **Refresh with a changed IP degrades then refills.** Card drops to `ip-only` (country from `loc=`) the moment the new trace lands, then grows back in place.
3. **A double ⌘R cannot produce an out-of-order write.** The abort is what makes this unrepresentable; a slow first response resolving after a faster second is the only path to a wrong IP with no fetch having failed. Hard to trigger by hand against a 0.4s endpoint — this may be the strongest argument in the whole map for a real seam.
4. **A failed refresh replaces a healthy card**, rather than annotating it or firing a toast.

Also relevant to the seam question: 08 rejected all caching and all timers, so the state surface stays a pure function of one fetch chain's outcome — nothing persists between runs to set up or tear down in a fixture.

---

## Resolution — 2026-07-27

**vitest over pure functions, 11 fixture cases, and a two-stage "done": the agent ships green, a human accepts.**

### The premise this ticket opened with was wrong

The ticket asserted that no published sibling in the corpus ships tests, and treated a test runner as an imposition needing justification. Measured against all 3105 extensions in `~/Projects/Raycast/extensions/extensions`:

| runner | extensions |
|---|---|
| vitest | 90 |
| jest | 37 |
| any `"test"` script | 163 (~5%) |

A minority choice, but an unremarkable one. `utc-workbench` ships `vitest.config.ts`, a `test-stubs/` directory and a plain `ray build`, and passed Store review. There is no CI here for a runner to complicate, so the cost is one devDependency and one config file.

### Test runner

**vitest.** `"test": "vitest run"`, `"test:watch": "vitest"`. Scope is deliberately narrow: pure functions against captured fixtures. No component tests, no network in tests, no mocking library.

### Where the seam goes

**Pure functions over already-fetched material. No injectable `fetch` anywhere.**

```ts
// src/lib/trace.ts — pure, tested
export function parseTrace(status: number, body: string):
  | { kind: "ok"; ip: string; loc: string }
  | { kind: "blocked"; status: number; reason: "status" | "not-a-trace" }

// src/lib/fetchTrace.ts — thin, untested
export async function fetchTrace(signal: AbortSignal) {
  try {
    const res = await fetch(TRACE_URL, { signal });
    return parseTrace(res.status, await res.text());
  } catch {
    return { kind: "unreachable" } as const;
  }
}
```

The seam takes `(status, body)` rather than `body` alone, because half of 04's taxonomy is HTTP-layer: `blocked` carries a status code, and the "2xx but not a trace" case — the one 09 wrote a third provenance footer for — is invisible to a parser that only sees the body. Taking the status in means the whole state mapping is tested except `unreachable`, which stays a three-line `catch`.

Rejected: a `readTrace(fetchImpl = fetch)` client with an injectable fetch. It would prove `unreachable` too, but at the price of a test-only parameter in a production signature, to cover a `catch` block that cannot be wrong in an interesting way.

Rejected: parsing the body only, with status handling in the React layer — it puts the least obvious branch in the least tested place.

### Three pure functions, eleven cases

The bar is stated as a **rule**, so a branch added later drags its own test in rather than aging out of a list: *every member of each returned union is produced by at least one fixture, and each known trap gets an explicitly named test.*

```
parseTrace(status, body)                                     5
  ok                    ← captured claude.ai trace (200)
  ok, IPv6              ← same shape, v6 ip=
  blocked "status"      ← 403 challenge HTML
  blocked "not-a-trace" ← 200, valid trace, h=example.com     ⭐ trap
  blocked "not-a-trace" ← 200, captive-portal HTML

parseGeo(json)                                               3
  ok                    ← captured ipwho.is body (fields-trimmed)
  failed                ← 200 + {"success":false}             ⭐ trap
  ok, isp omitted       ← empty connection.isp, segment dropped per 05

nextState(prev, trace)                                       3
  same IP     → ok, location line unchanged                   08 #1
  changed IP  → ip-only(new ip, loc=)                         08 #2
  failure     → replaces the healthy card                     08 #4
```

`unreachable` needs no fixture — it is the `catch`, and it is observed by hand with the wifi off.

### A second geo trap, found while capturing fixtures

05 requires branching on the `success` boolean rather than `response.ok`. Capturing the fixtures showed that the obvious spelling of that rule is also wrong.

`?fields=` trimming **drops `success` from a successful response**, while a failure keeps it. Both bodies are HTTP 200:

```
GET /155.248.192.115?fields=country,country_code,city,connection
{"country":"United States","country_code":"US","city":"San Jose","connection":{...}}   ← no "success" key

GET /10.0.0.1?fields=country,country_code,city,connection
{"ip":"10.0.0.1","success":false,"message":"Reserved range"}                            ← "success" present
```

So `if (!json.success) degrade` fails **every healthy lookup**, and `if (json.success === true)` fails the same way. **The guard is `json.success === false`.** This refines 05 rather than contradicting it — 05's substance (never `response.ok`, degrade on `success:false`) stands untouched.

The fixture set already catches it: the `ok` fixture is the fields-trimmed body, so a naive guard turns the happy path red on the first run. Worth stating in the spec anyway, because a build session that "fixes" the failing test by loosening the guard would reintroduce the sibling's bug.

### Fixtures

**Real captured bytes, embedded in the spec so tests can be written offline**, with `ip=` swapped to `203.0.113.9` (RFC 5737 TEST-NET-3) and `2001:db8::1` for the v6 twin — the shape stays real, no personal exit IP lands in a repo headed for the Store. The trace fixture keeps all 16 Cloudflare keys, so a future key reordering or rename shows up as a test failure rather than a silent wrong card.

Sources: the trace body was captured live in this session; the ipwho.is bodies come from [02](02-geo-provider-options.md)'s captures, including the fields-trimmed success and the reserved-range failure. (A live re-capture of ipwho.is during this session failed with a TLS error, `HTTP 000`, twice — a transient local network fault, not a provider change. Noted only so the provenance is honest.)

The two synthetic fixtures — the `h=example.com` trace and the captive-portal HTML — carry a comment saying they are invented, so nobody later mistakes them for evidence of a real middlebox.

**02's never-measured over-quota response needs no fixture at all.** 05 folded over-quota into the single degraded state, so it exercises the same branch as any other geo failure. The gap this ticket inherited is closed by elimination rather than by an invented fixture.

### Layout

Co-located, inside `tsconfig`'s `include: ["src"]` so tests are type-checked under the same strict settings as source. `ray build` never bundles them: nothing in `src/index.tsx`'s import graph reaches a `.test.ts`.

```
src/
  index.tsx
  lib/
    trace.ts        trace.test.ts
    geo.ts          geo.test.ts
    refresh.ts      refresh.test.ts
    __fixtures__/
      trace-ok.txt              trace-ok-v6.txt
      trace-challenge-403.html  trace-wrong-host.txt
      trace-captive-portal.html
      geo-ok.json  geo-reserved.json  geo-no-isp.json
vitest.config.ts    # include: ["src/**/*.test.ts"]
```

Rejected: a root `tests/` directory. Tidier separation, but it falls outside `include: ["src"]` — `utc-workbench` ships exactly that configuration and its tests are silently un-type-checked. Co-location is also the majority placement in the corpus (7 of 10 sampled).

### Stage 1 — the machine gate

Four scripts, in order, all green:

```
npm run lint        # ray lint — eslint + prettier
npm run type-check  # tsc --noEmit — the only one that covers the test files
npm test            # vitest run — 11 cases
npm run build       # ray build — bundles and type-checks the entry graph
```

`type-check` is a new script; `typescript` is already a devDependency, so it costs nothing. It earns its place because `ray build` type-checks from the command entry graph, which never imports a `.test.ts` — without it, a type error confined to a test surfaces only when vitest happens to run.

`ray build` type-checks by default (it exposes `--skip-types` to opt out), so the two overlap on source and complement each other on tests.

Tests are **not** chained into `build`. `npm run publish` runs a build; a Store publish must never depend on a test run.

### Stage 2 — what a human must see

Raycast state cannot be observed by a headless agent, and this repo's default is to hand implementation to Codex. So "done" splits, and the split is the point:

| Stage 1 — agent, headless | Stage 2 — human, in Raycast |
|---|---|
| four gates green | loading → ip-only → ok, watched through |
| 11 fixture cases passing | `geo-failed` (forced) |
| recipe left verbatim in the spec | `blocked` (forced) |
| | `unreachable` (wifi off) |
| | 4 actions fired, clipboard checked |
| | ⌘R same IP · ⌘R after a VPN switch |

**Green is not done.** The agent reports gates green and explicitly does not claim any state was seen. The extension is accepted only after the sweep; a failure there reopens the build session rather than filing a new ticket.

The action sweep checks 09's rules concretely: no flag emoji in any clipboard payload, Copy IP + Location hidden during `ip-only` but present on `geo-failed`, Refresh primary on both failure cards.

### How the failure states are made to appear

A **documented temporary-edit recipe** in the spec — one line per state, reverted after looking:

| To see | Temporary edit |
|---|---|
| `geo-failed` | point the geo host at an unroutable name |
| `blocked`, non-2xx | point the trace host at a URL that 404s |
| `blocked`, 2xx not-a-trace | point the trace host at `example.com` |
| `unreachable` | turn wifi off — no edit needed |
| loading / `ip-only`, held open | `await new Promise(r => setTimeout(r, 2000))` before the geo call |

Zero shipped complexity, and it exercises the real wiring rather than a stub. 06 ruled out preferences entirely, so a shipped `__FORCE_STATE` escape hatch would be test-only code contradicting a decision already made. The last row matters: 07's progressive render and 09's empty loading H1 are ~0.4s on a healthy network — too fast to judge by eye, and the temptation is to tick them unseen.

### 08's abort ordering — stated as a code shape, not tested

08's fourth behaviour (a double ⌘R cannot produce an out-of-order write) is the one thing here with no test and no observation, and deliberately so: **the ordering guarantee is `usePromise({ abortable })`'s, not ours.** A test for it would mostly re-verify a library contract, and would require exactly the injectable fetch rejected above.

What our code owes is that the hook's signal actually reaches the network. Requirement for [10](10-write-spec.md) to write down:

> Both fetches receive `AbortSignal.any([hookSignal, AbortSignal.timeout(5000)])` — the hook's abortable signal combined with 04/05's own budget. Neither call may construct a bare `AbortSignal.timeout` and drop the hook's signal.

Verified by reading the diff, plus a double-⌘R sanity press in stage 2. Recorded here so that if a wrong IP ever renders with no fetch having failed, this is the first line to check.

### Consequences for 10

1. The spec carries the fixture **bytes** verbatim, not a description of them — otherwise the build session needs network to write tests, and the redaction convention gets lost.
2. The spec carries the temporary-edit recipe verbatim, as the stage-2 procedure.
3. The spec states the `AbortSignal.any` requirement and the `success === false` guard as explicit build requirements, both being cases where the natural spelling is the wrong one.
4. The spec's acceptance section is written in two stages, with "green ≠ done" stated in those terms.
