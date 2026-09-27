# 08 — Refresh and caching behaviour

Parent: [map.md](../map.md)
Type: grilling
Status: **resolved** 2026-07-27
Blocked by: 04

## Question

When does the extension fetch, and what does it show while it waits?

Decide:

- Fetch on every launch, or serve a cached value first and revalidate? A stale exit IP is actively misleading right after a proxy switch — that argues against showing cache as if it were fresh.
- If cached: where (`@raycast/utils` `useCachedPromise` / `Cache`), for how long, and how staleness is signalled.
- Manual refresh: an action, a keyboard shortcut, both?
- Loading state: `isLoading` spinner over an empty card, or over the last known value.

## Notes carried in from 09

[09](09-actions-and-copy.md) worded every slot on the card and left two hooks that are yours:

1. **Freshness suffix.** The healthy caption ships as `The IP claude.ai sees you from`. It is the natural home for a staleness signal (`… · updated 2m ago`) if you decide staleness must be visible — 09 declined to reserve the space blind.
2. **The no-toast rule is conditional.** 09 ruled out `showToast` entirely *because a failed fetch replaces the card*, so the card always states its own failure. If you keep the last-good card on screen after a failed refresh, that stops being true and a toast becomes the only place the failure can live.

Also fixed by 09, and constraining the cold-start answer: the `loading` state is an **empty card** with `isLoading={true}` — no `…`, no skeleton, no caption. Its only action is Refresh.

---

## Resolution

**No cache. One fetch chain per launch, one refresh semantic, no timers.**

### Facts established before deciding

- `useCachedPromise` persists the last value across command runs but has **no TTL** — a staleness window would have to be hand-rolled from a `fetchedAt` stored inside the cached payload. `usePromise` does not cache. `useCachedState` / `Cache` are the manual escape hatches.
- The sibling `ipcheck-ing` caches nothing: raw `useState` / `useEffect`, cold fetch every launch. No prior art to inherit here.
- Neither [04](04-source-and-fallback-decision.md) nor [05](05-geo-decision.md) says anything about retry counts — each specifies a 5s budget and the state its outcome lands in. That gap was 08's to close.

### Caching

**None.** `usePromise`, cold trace fetch on every launch, card opens in 09's empty `isLoading` state.

The command is opened *at the moment something changed* — VPN toggled, proxy node switched. A cache serves the wrong answer at exactly the highest-value moment, and 01's measured 0.38s happy path is not a latency worth insuring against.

This disposes of the ticket's remaining sub-questions by elimination: no cache location to choose, no TTL to pick, no staleness to signal. **No `useCachedPromise`, no `Cache`, no `useCachedState`, no `LocalStorage` anywhere in the extension.**

### Both of 09's hooks close, neither taken

**1. Freshness suffix — declined.** The healthy caption ships exactly as 09 wrote it: `The IP claude.ai sees you from`, nothing appended.

With no cache there is no stale-serve path left to guard: the value is fresh by construction at paint, and a Raycast view command unmounts on dismissal, so card age is bounded by the user staring at it. The alternatives each cost more than the exposure:

| Form | Why rejected |
|---|---|
| `· updated 2m ago` | Needs a `setInterval` re-render or it still reads `just now` after ten minutes — becoming the exact lie it was added to prevent. A timer loop existing purely to keep a caption honest, in an extension with no other timers. |
| `· updated 14:32` | Timer-free and can't lie, but two refreshes inside the same minute look identical, so it only half-solves the feedback gap — while adding permanent clutter to a card 07 deliberately held to four slots. |

**2. The no-toast rule becomes unconditional.** A refresh that fails on top of a healthy card **replaces** it with 09's `blocked` / `unreachable` card, provenance footer and all. 09's rule was conditional on *"a failed fetch replaces the card"*; this makes that true in every path, not just cold start. `showToast` stays out of the extension entirely.

The reasoning is Q1's, one step later in time: a last-good IP that has just failed to re-verify is precisely a stale value passing for fresh. It leaves the screen. The user loses a copyable value, but ⌘R is already primary on both failure cards.

### Refresh

**One semantic, in every state: discard everything, re-fetch the trace, re-fetch geo for whatever IP it returns.** Including from the partial `geo-failed` card — a geo-only retry would assume the IP hasn't changed since the last trace, which is the exact assumption this extension exists to distrust, and would enrich a possibly-stale IP while presenting the result as current. The ~0.4s spent re-fetching a trace that just succeeded is not worth a second code path.

**In flight the current card holds**, with `isLoading` over it. No blanking, no placeholder glyphs — 09's empty card exists so a *cold start* shows nothing misleading, not as a state to re-enter. Blanking a correct card to redraw the same IP is a downgrade, and 07 already cut `Locating…` for this reason.

**⌘R during an in-flight fetch aborts it and starts a new one** — `usePromise({ abortable })`, an `AbortController` the fetch honours alongside 04/05's `AbortSignal.timeout`. Latest press wins.

Not a nicety: without it a slow first request can resolve *after* a faster second one and overwrite newer data with older. That is the one way this extension could display a genuinely wrong IP with no fetch having failed. Aborting makes it unrepresentable rather than unlikely. Ignoring the press instead would also strand the user on the unreachable path, watching a 5s timeout with a Refresh key that silently does nothing; disabling Refresh would contradict 09, which made it the loading card's only action.

### The refresh race — resolved by comparing IPs

05's progressive render means the trace lands ~0.4s before its geo. On a refresh that opens a window where the card could show a **new IP beside the previous IP's city and ISP** — wrong, and wrong in a way that looks entirely healthy.

At the moment the trace lands, compare the fetched IP to the one on screen:

- **Same IP** → the existing city and ISP are still correct for it, so **the location line never moves**; fresh geo swaps in underneath, invisibly.
- **Different IP** → the old location is now wrong, so the card **drops to 07's `ip-only` state** — country from the trace's own `loc=` via `Intl.DisplayNames` — and grows back in place exactly as a cold start does.

The only option that never shows a wrong pairing *and* never flickers a card that didn't change. Cost is one string comparison. Always dropping to `ip-only` was rejected for stripping city and ISP on every refresh even when nothing changed; holding the card until both fetches land was rejected for withholding an IP that arrived at 0.4s for up to 5s, contradicting 05.

### Retry

**None automatic.** The trace gets one attempt on its 5s budget, geo one on its own, and whatever the attempt yields is the state the card lands in.

04's three states and 05's degrade rule are both defined on a *single* attempt's outcome — a silent retry would put the card in a state neither ticket described, and would force 09's provenance footer to choose which of two attempts' status codes to report. It also doubles worst-case wall time to ~10s on the unreachable path, the case where a fast answer matters most. 09 already made Refresh primary on both failure cards: **the retry is the design, it is simply manual.**

### Consequences recorded without a separate decision

- **No auto-refresh, no interval, no focus-refresh, no timers anywhere.** Follows directly from rejecting the ticking caption; a card that silently changes under the user is worse than one that doesn't.
- Manual refresh stays exactly as 09 specified — action *and* shortcut, `⌘R`, primary on both failure cards. Not re-opened.

### Accepted cost, recorded so it is not rediscovered

**A refresh that returns the same IP shows almost nothing.** The loading bar is the only proof it ran. Every fix for this was rejected on stronger grounds — timestamp suffix (clutter or a timer), toast (09), forced flicker (Q2). Partially mitigated by the race rule above: when the IP *has* changed — the case that actually matters — the card visibly degrades and refills, which is unmistakable.

### Handoff

- **To [11](11-verification-story.md)** — four behaviours that need to be checkable, all invisible to a static screenshot: a refresh with an unchanged IP holds the location line; a refresh with a changed IP degrades to `ip-only` then refills; a double ⌘R cannot produce an out-of-order write; a failed refresh replaces a healthy card rather than annotating it.
- **To [10](10-write-spec.md)** — `usePromise` with `abortable`, no caching dependency, no timer, one fetch chain reused by both cold start and refresh.
