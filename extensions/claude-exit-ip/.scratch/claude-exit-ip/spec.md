# Spec — Claude Exit IP (Raycast extension)

Status: ready-for-agent
Map: [map.md](map.md) — eleven decision tickets, all resolved
Target repo: `/Users/ken/Projects/Raycast/claude-exit-ip` (own git repo, currently empty but for `AGENTS.md` and `docs/`)

This spec is self-contained. An implementer who has read none of the map can build the extension from it without asking a question. Where it quotes bytes, copy, or a manifest verbatim, that is deliberate — those are decisions that prose would blur.

---

## Problem Statement

A person using Claude through a VPN, proxy, or split-tunnel setup cannot tell **which country Anthropic thinks they are in**. Every "what is my IP" tool answers a different question: it reports the exit IP a *neutral* endpoint sees, which under split routing is a different IP in a different country from the one `claude.ai` sees. That gap is not hypothetical — it was measured while charting this map: a neutral endpoint and `claude.ai` returned different IPs in different countries on the same machine at the same moment.

So when Claude behaves as though the user is somewhere unexpected, the user has no way to check the premise. They toggle a VPN node and re-run a generic IP tool that keeps telling them about a route Claude isn't using.

## Solution

A Raycast extension with a single `view` command, **Show Exit IP**, that asks `claude.ai` itself what it sees and renders the answer as one card: flag and IP as the headline, country · city · ISP beneath it, and a caption saying what the number means.

The IP paints as soon as it lands (~0.4s), with the country already filled in from the same response; city and ISP arrive ~0.6s later and grow the line in place. When location lookup fails the card degrades to country-only and **says so**. When `claude.ai` can't be reached, or something that isn't Claude answers in its place, the card says which of those two happened and shows what it called and what came back.

Four actions: copy the IP, copy the IP with its location, copy the ASN, refresh.

---

## User Stories

1. As a VPN user, I want to see the exit IP `claude.ai` sees me from, so that I can tell whether my Claude traffic is leaving where I think it is.
2. As a VPN user, I want the country of that IP shown as a flag and a name, so that I can judge my apparent location at a glance without decoding an IP.
3. As a split-tunnel user, I want the answer to come from `claude.ai` specifically, so that a generic IP tool's answer about a different route doesn't mislead me.
4. As a user who just switched proxy nodes, I want the command to fetch fresh every time it opens, so that I never see a cached answer from before the switch.
5. As a user opening the command, I want the IP to appear as soon as it is known rather than waiting for location enrichment, so that the answer I came for isn't held up by detail I didn't ask for.
6. As a user watching the card fill in, I want the country to be there from the first paint, so that the location line grows rather than jumping or flashing a placeholder.
7. As a user, I want the city and ISP for the exit IP, so that I can distinguish two nodes in the same country.
8. As a user, I want the ISP shown as the operator name I'd recognise, so that "Oracle Corporation" doesn't reach me as "Oracle Public Cloud".
9. As a user whose exit node has no ISP data, I want the segment simply omitted, so that the card doesn't pad itself with "Unknown".
10. As a user, I want to copy the IP with one keypress, so that I can paste it into a ticket or a shell.
11. As a user, I want to copy the IP together with its location as one line, so that I can paste a complete description into a bug report.
12. As a user debugging routing, I want to copy the ASN, so that I can look up the network operator directly.
13. As a user pasting into a terminal or a commit message, I want no flag emoji in the clipboard, so that my paste doesn't become tofu or a stray `US`.
14. As a user, I want a refresh action on a shortcut, so that I can re-check after toggling a VPN without closing and reopening the command.
15. As a user pressing refresh, I want the current card to stay on screen while the new fetch runs, so that a correct answer isn't blanked to be redrawn identically.
16. As a user refreshing when nothing has changed, I want the location line to stay exactly as it is, so that the card doesn't flicker to prove it did something.
17. As a user refreshing after my exit IP has changed, I want the card to drop back to country-only and refill, so that I never see a new IP paired with the previous IP's city.
18. As a user hammering the refresh key, I want the latest press to win, so that a slow earlier response cannot overwrite a newer answer with a stale one.
19. As a user whose location lookup failed, I want the card to still show the IP and country, so that a failure in the enrichment doesn't cost me the answer.
20. As a user whose location lookup failed, I want the card to say so on the line itself, so that a degraded result can never pass for a complete one.
21. As a user whose location lookup failed, I want the marker to name a failure rather than describe sparse coverage, so that I don't read a broken lookup as a normal result.
22. As a user behind a captive portal, I want the card to tell me that something answered but it wasn't Claude, so that I know to sign in to the network rather than blame Anthropic.
23. As a user behind a corporate proxy, I want the failure copy to name the likely suspects without guessing which one, so that I'm not sent down the wrong path by a confident wrong answer.
24. As a user with no connectivity, I want a distinct "couldn't reach" message, so that I can tell "nothing answered" from "the wrong thing answered".
25. As a user filing a bug, I want the failed card to show what was called and what came back, so that I can paste a precise provenance line.
26. As a user hitting an interceptor that returns a valid-looking 200, I want the card to reject it rather than display its IP, so that a middlebox can't put a plausible wrong number in front of me.
27. As a user on a failure card, I want refresh to be the primary action, so that the key I press first does the thing the card just told me to do.
28. As a user, I want no toast on top of the card, so that a failure isn't announced twice over the message that already states it.
29. As a user in the loading moment, I want no placeholder glyph in the headline slot, so that my eye isn't drawn to a character that exists for 0.4 seconds.
30. As a user, I want actions hidden when their value is still in flight, so that an action's payload never changes silently under me.
31. As a user, I want actions hidden when their value doesn't exist, so that a copy action can't hand me an empty string.
32. As a user on an IPv6 exit node, I want the same card, so that dual-stack isn't a second-class case.
33. As a user browsing the Raycast Store, I want the extension title to say what it does beyond "IP", so that I can tell it apart from the generic IP extensions already listed.
34. As the maintainer, I want the extension to hold no preferences, so that nobody is asked a configuration question they have no basis to answer.
35. As the maintainer, I want the parsing logic covered by fixture tests, so that the two known traps can't regress silently.
36. As the maintainer, I want the fixtures to be real captured bytes, so that a change in a provider's response shape shows up as a failing test rather than a wrong card.
37. As the maintainer, I want no personal exit IP committed to the repo, so that publishing to the Store doesn't publish my address.
38. As the maintainer, I want a documented way to force each failure state, so that failure cards can be seen rendered rather than reasoned about.
39. As the maintainer, I want acceptance split into a machine gate and a human sweep, so that a headless agent never claims to have seen a card it cannot open.

---

## Implementation Decisions

### 1. One command, one view

A single `view`-mode command rendering a Raycast `Detail`. **Markdown only — no `Detail.Metadata` panel.** The panel was built as a prototype variant and rejected: it restates in labelled rows what the card already reads in prose, and it halves the width available to the ISP before truncation. ASN, the only field the panel added, is routed to a copy action instead.

### 2. Manifest, verbatim

Ships as written. The command title is deliberately *not* "Show Claude Exit IP" — the brand is already in the extension title, and stacking it twice in one root-search row reads badly. Discovery is unaffected: root search matches the extension title too.

```jsonc
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "claude-exit-ip",
  "title": "Claude Exit IP",
  "description": "Show the exit IP address and location claude.ai sees you connecting from",
  "icon": "extension-icon.png",
  "author": "marcuslannister",
  "categories": ["Developer Tools", "Web"],
  "platforms": ["macOS"],
  "license": "MIT",
  "keywords": ["claude", "anthropic", "ip", "exit ip", "geolocation"],
  "commands": [
    {
      "name": "index",
      "title": "Show Exit IP",
      "description": "Show the exit IP address and location claude.ai sees you connecting from",
      "mode": "view"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.104.23",
    "@raycast/utils": "^2.2.7"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.2.0",
    "@types/node": "^26.1.1",
    "@types/react": "19.2.17",
    "eslint": "^10.7.0",
    "prettier": "^3.9.6",
    "typescript": "^6.0.0",
    "vitest": "^4.1.5"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "lint": "ray lint",
    "fix-lint": "ray lint --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

**No `preferences` key at all** — not empty, absent. Every candidate preference was disposed of by an earlier decision: geo provider (a question the user has no basis to answer), fallback host (rejected on principle), refresh interval (no timers exist). **No `node-fetch`** — global `fetch` with `AbortSignal` is the current idiom. **No `engines`.**

### 3. Module layout and the seams

Three pure modules carry all the logic; everything else is a thin wrapper or a render.

```
src/
  index.tsx                  the Detail, the action panel, the fetch orchestration
  lib/
    trace.ts                 parseTrace(status, body)      pure, tested
    geo.ts                   parseGeo(json)                pure, tested
    refresh.ts               nextState(prev, trace)        pure, tested
    fetchTrace.ts            thin wrapper, untested
    fetchGeo.ts              thin wrapper, untested
    flag.ts                  code → emoji, pure
    __fixtures__/            captured bytes
assets/extension-icon.png
vitest.config.ts             include: ["src/**/*.test.ts"]
```

**The seam is the three pure functions. There is no injectable `fetch` anywhere in production code.** The wrappers exist only to turn a network call into an already-fetched value:

```ts
export async function fetchTrace(signal: AbortSignal) {
  try {
    const res = await fetch(TRACE_URL, { signal });
    return parseTrace(res.status, await res.text());
  } catch {
    return { kind: "unreachable" } as const;
  }
}
```

`parseTrace` takes the **status as well as the body**. Half the failure taxonomy is HTTP-layer — the blocked state carries a status code, and the "2xx that isn't a trace" case is invisible to a parser that sees only a body — so passing the status in is what makes the whole state mapping testable.

### 4. The exit-IP source

```
GET https://claude.ai/cdn-cgi/trace          5s budget
```

**One host, no fallback.** A different host's exit IP under the same label would answer a different question. All three Anthropic hosts returned the identical IP when measured, so a fallback buys nothing on the happy path and lies on the unhappy one.

The response is Cloudflare's `key=value\n` block. Accept it as a genuine trace only when **all three** hold:

1. A line matches `^ip=`.
2. The value right of `=` validates as an IPv4 or IPv6 address.
3. The body contains `h=claude.ai`.

Check 3 is the load-bearing one: `h=` echoes the host whose edge served the response, proving the answer came from Cloudflare's `claude.ai` edge rather than a captive portal or transparent proxy that returned something parseable. Capture `loc=` in the same pass — it carries the country code the degraded card needs.

**Three states:**

| State | Detected by | Carries |
|---|---|---|
| `ok` | all three checks pass | `ip`, `loc` |
| `blocked` | response completed (any status) but validation failed | `status`, and whether it failed on status or on validation |
| `unreachable` | request never completed — DNS, refused, TLS, or timeout | — |

Timeouts fold into `unreachable`: a proxy that hangs and a proxy that's down call for the same next action.

### 5. The geo lookup

```
GET https://ipwho.is/<ip>?fields=country,country_code,city,connection      5s budget
```

Keyless, HTTPS, bare `fetch`, no custom User-Agent, no fallback provider.

**Two guards, both counter-intuitive, both required:**

- **Never branch on `response.ok`.** A reserved-range or invalid IP returns **HTTP 200** with `{"success":false,…}`. The sibling extension `ipcheck-ing` guards with `if (!response.ok) throw`, which that response sails past, rendering `undefined` into the card.
- **The guard is `json.success === false`, not `!json.success`.** The `?fields=` trim **drops `success` from a successful body** while keeping it on a failure. Both are HTTP 200:

  ```
  ?fields=…  on a public IP    → {"country":"United States","country_code":"US","city":"San Jose","connection":{…}}
  ?fields=…  on 10.0.0.1       → {"ip":"10.0.0.1","success":false,"message":"Reserved range"}
  ```

  So `if (!json.success)` fails **every healthy lookup**, and so does `json.success === true`. If the happy-path test goes red, the fix is never to loosen this guard.

**Location line: country · city · `connection.isp`.** Region is dropped (redundant with city, and the room lets the ISP survive truncation). ASN is fetched but not displayed — it arrives free inside the `connection` bundle and feeds a copy action. `isp` not `org`: they disagree on cloud egress, and `isp` is the name a person recognises. An empty `isp` **omits the segment** — no `Unknown` placeholder, no fallback to `org`.

**Geo failure degrades, it never errors.** One degraded state absorbs every cause: network error, timeout, non-2xx, and `success:false`. The provider's documented 1,000/day cap therefore needs no rule of its own — over-quota is just another geo failure.

**Flag is computed locally** from the two-letter code by regional-indicator arithmetic (`String.fromCodePoint(127397 + …)`), never requested from the API even though the provider offers `flag.emoji`. The degraded path must render a flag from the trace's own `loc=`, so a local function is required regardless; taking the provider's too would mean two sources feeding one slot. **Country name from `Intl.DisplayNames`** — built into Node, zero dependency. Accepted wrinkle: its wording can differ from the provider's, so `HK` degrades to "Hong Kong SAR China" where the healthy line reads "Hong Kong".

### 6. Progressive render

The calls are serial by necessity — geo needs the IP the trace returns — but the card never waits for both:

```
t=0.0s   fetch claude.ai/cdn-cgi/trace      (5s budget)
t≈0.4s   IP + country paint from the trace's own loc=
t≈0.4s   fetch ipwho.is/<ip>                (5s budget)
t≈1.0s   location line grows in place, or degrades
```

Worst case: IP visible at 5s, location settled by 10s.

### 7. Six card states

Four markdown slots throughout: **H1**, **location line**, **horizontal rule**, **footer**. The hierarchy is carried entirely by heading level and the rule — `Detail` markdown offers no colour control.

| State | H1 | Location line | Footer |
|---|---|---|---|
| `loading` | *(empty)* | — | — |
| `ip-only` | flag + IP | `United States` | caption |
| `success` | flag + IP | `United States · San Jose · Oracle Corporation` | caption |
| `geo-failed` | flag + IP | `United States — location lookup failed` | caption |
| `blocked` | failure title | failure body | provenance |
| `unreachable` | failure title | failure body | provenance |

The healthy card:

```markdown
# 🇺🇸 129.146.12.34

United States · San Jose · Oracle Corporation

---

The IP claude.ai sees you from
```

The failure card keeps the same four slots and swaps the caption for provenance:

```markdown
# Couldn't reach claude.ai

Nothing came back at all — your connection or proxy is down, or something is
blocking `claude.ai` before it can respond. Check your network, then refresh.

---

claude.ai/cdn-cgi/trace · no response
```

*(Both markdown blocks are transcribed from the prototype that settled the layout — four variants were rendered live in Raycast and this one was chosen.)*

**One flag per card, in the H1 beside the IP, never beside the country name.** A country rendered `🇺🇸 United States` next to an IP already flagged `🇺🇸` reads as two facts when it is one.

**The failure title takes the H1 slot at full weight**, not demoted to H2: a card that cannot answer its own question should say so at the volume it would have answered.

**The loading H1 is empty markdown with `isLoading={true}`.** No `…`, no skeleton, no caption. Raycast's loading bar is the first-class idiom; a large glyph that exists for 0.4s and is then swapped for different large content draws the eye to the one moment it shouldn't.

**The partial marker is inline**, on the line it qualifies, after the country, em-dash separated. It cannot be read apart from the fact it qualifies and costs no vertical space.

### 8. Copy, verbatim

**Caption (healthy):** `The IP claude.ai sees you from`

**Partial marker:** `— location lookup failed`

Cause-agnostic by design; it does not distinguish rate-limited from unreachable, because the user's next move is identical and `success:false` often doesn't say why. Not "country only": that describes *coverage* and reads as a calm statement of fact, which is exactly the failure mode the degrade marker exists to prevent — a card that legitimately knows little would just say `United States`.

**Blocked:**

> # Something answered, but not Claude
>
> The response didn't come from Claude's edge — usually a proxy, VPN, or captive portal answering in its place. Check that your proxy is running and you're signed in to the network, then refresh.

Names all three suspects in likelihood order and **does not guess which**. Never says "claude.ai is down": a 5xx lands here, but so does a hotel wifi login page, and blaming Anthropic for the hotel is the worse error.

**Unreachable:**

> # Couldn't reach claude.ai
>
> Nothing came back at all — your connection or proxy is down, or something is blocking `claude.ai` before it can respond. Check your network, then refresh.

The two titles are a deliberate opposition — *something answered* vs *couldn't reach* — so a user who meets both over time learns the distinction without reading a body. The body **omits the 5-second timeout deliberately**: DNS failure, connection refused and TLS failure all land in `unreachable` and most return instantly, so "no response within 5 seconds" would be false on the common path.

**Provenance footers — three, not two.** Bare and monospace, in the caption's position. Blocked fires on *any* status including 200, and a bare `HTTP 200` under "Something answered, but not Claude" would read like success:

| Case | Footer |
|---|---|
| Unreachable | `claude.ai/cdn-cgi/trace · no response` |
| Blocked, non-2xx | `claude.ai/cdn-cgi/trace · HTTP 403` |
| Blocked, 2xx, validation failed | `claude.ai/cdn-cgi/trace · HTTP 200 · not a claude.ai trace` |

The third row is where the `h=claude.ai` check surfaces on screen.

### 9. Actions

| Action | Shortcut | Payload |
|---|---|---|
| Copy IP | `⏎` (primary) | `104.28.51.12` |
| Copy IP + Location | `⌘⇧C` | `104.28.51.12 · United States · San Francisco · Cloudflare, Inc.` |
| Copy ASN | `⌘⇧A` | `AS13335` |
| Refresh | `⌘R` | — |

All copies use **`Action.CopyToClipboard`** — it writes, shows Raycast's own HUD, and closes the window, which is what a Raycast user expects from `⏎` on a copy action. Accepted cost: the HUD's generic wording, so no `"IP Copied · 1.2.3.4"` echo.

**No flag emoji in any clipboard payload** — it renders as tofu in terminals, commits, and plain-text tickets. ASN is prefixed `AS` (the provider returns a bare number) and omits the ISP name, which the other copy action already carries. On the degraded card, Copy IP + Location yields `104.28.51.12 · United States` — sparse but true, **with no partial marker in the clipboard**: the marker exists so the *card* cannot overstate what it knows, and a pasted line makes no such claim.

**Per-state availability**, primary first:

| State | Actions |
|---|---|
| `loading` | Refresh |
| `ip-only` | Copy IP |
| `success` | Copy IP · Copy IP + Location · Copy ASN · Refresh |
| `geo-failed` | Copy IP · Copy IP + Location · Refresh |
| `blocked` | Refresh |
| `unreachable` | Refresh |

The rule: **never copy a value still in flight, never copy a value you don't have.** Copy IP + Location and Copy ASN hide during `ip-only` because geo is still resolving and an action whose payload silently changes at t≈1.0s is a small betrayal; on `geo-failed` they behave differently because geo is *settled*. Pending and final are not the same condition.

**Refresh is primary on both failure cards** — `⏎` does the one useful thing, which is also what both bodies just told the user to do.

**Cut:** *Open claude.ai* (this is not a launcher), *Open a lookup page* (ships the user's exit IP to an unvetted third party to show them what the card already shows), *Copy Error Details* (a fifth action for a rare case, and the footer is short enough to read off screen).

### 10. Refresh, caching, and the race

**No caching of any kind.** `usePromise`, cold fetch on every launch. No `useCachedPromise`, no `Cache`, no `useCachedState`, no `LocalStorage` anywhere in the extension. The command is opened *at the moment something changed* — VPN toggled, node switched — so a cache would serve the wrong answer at the highest-value moment, and a 0.38s happy path is not a latency worth insuring against.

**No timers anywhere**: no auto-refresh, no interval, no focus-refresh. **No freshness suffix** on the caption — any relative label needs a `setInterval` or it becomes the lie it was added to prevent, and an absolute clock time can't distinguish two refreshes in the same minute while permanently cluttering a card held to four slots.

**One refresh semantic in every state:** discard everything, re-fetch the trace, re-fetch geo for whatever IP comes back — including from the degraded card. A geo-only retry would assume the IP hasn't changed since the last trace, which is the exact assumption this extension exists to distrust.

**In flight, the current card holds** under `isLoading`. The empty loading card exists for cold start, not as a state to re-enter.

**⌘R during an in-flight fetch aborts it and starts a new one** — `usePromise({ abortable })`. Without it, a slow first request can resolve after a faster second and overwrite newer data with older: the one way this extension could display a genuinely wrong IP with no fetch having failed.

> **Build requirement.** Both fetches must receive `AbortSignal.any([hookSignal, AbortSignal.timeout(5000)])` — the hook's abortable signal combined with the call's own budget. Neither call may construct a bare `AbortSignal.timeout` and drop the hook's signal, or the abort ordering silently doesn't hold. This is the natural spelling being the wrong one; it is checked by reading the diff, not by a test.

**The refresh race is resolved by comparing IPs.** The trace lands ~0.4s before its geo, which on a refresh opens a window where the card could show a *new IP beside the previous IP's city and ISP* — wrong, and wrong in a way that looks entirely healthy. At the moment the trace lands:

```
nextState(prev, trace)

  prev = ok(1.2.3.4, "San Jose · Comcast") + trace ok 1.2.3.4
    → ok, location line unchanged                     (geo swaps in underneath, invisibly)

  prev = ok(1.2.3.4, …)                   + trace ok 5.6.7.8
    → ip-only(5.6.7.8, country from loc=)             (grows back exactly as a cold start does)

  prev = ok(1.2.3.4, …)                   + trace unreachable
    → unreachable                                     (the failure card replaces the healthy one)
```

Always dropping to `ip-only` was rejected for stripping city and ISP on every refresh even when nothing changed; holding the card until both fetches land was rejected for withholding an IP that arrived at 0.4s for up to 5s.

**No automatic retry.** One attempt each, on its own budget. The three trace states and the geo degrade rule are all defined on a *single* attempt's outcome; a silent retry would put the card in a state no decision describes and force the provenance footer to choose which attempt's status code to report. Refresh is already primary on both failure cards — **the retry is the design, it is simply manual.**

**No toasts anywhere.** `showToast` does not appear in the extension. Both failure states own the whole card at three levels of detail, so a toast is a fourth statement of a failure the user is staring at, overlaid on the message that already states it. A failed refresh **replaces** the healthy card rather than annotating it, which is what makes this unconditional: a last-good IP that has just failed to re-verify is precisely a stale value passing for fresh, so it leaves the screen.

**Accepted cost, recorded so it isn't rediscovered:** a refresh that returns the same IP shows almost nothing — the loading bar is the only proof it ran. Every fix was rejected on stronger grounds. Partially mitigated by the compare rule: when the IP *has* changed, the card visibly degrades and refills.

### 11. Repo bootstrap

MIT `LICENSE` at the root. npm, with `package-lock.json` committed. `.gitignore` from the `ray` template. A `README.md`. The `ray` CLI arrives transitively via `npm install` — it is not a direct dependency.

**The icon must be rendered fresh**: a 512×512 PNG of Anthropic's sunburst glyph, cream on clay, produced from Anthropic's own brand SVG. **Do not copy `assets/icon.png` from `claude-sessions` or any other extension** — "sunburst on clay" fixes what it depicts, not where the pixels come from. One asset, no `@dark` twin: the mark sits on a solid background, so it reads on both themes.

**Provenance and attribution.** The approach is derived from `ipcheck-ing` (jason5ng32, MIT), which the README credits as prior art. **No code is copied**, so no MIT notice is incurred: the reusable part turned out to be a two-line split-and-find plus an IP regex, and its geo client cannot be reused at all — it contains the `response.ok` bug this spec explicitly guards against.

---

## Testing Decisions

### What makes a good test here

A test asserts what a **pure function returns for a given input**, and nothing about how it got there. No test mocks `fetch`, spies on a call, or renders a component. Every test is a fixture in, a value out — which is possible only because the parsing and the state transition were separated from the fetching.

**Prior art:** 90 of the 3105 extensions in the local `raycast/extensions` corpus ship vitest (37 ship jest; ~5% have a `test` script). `utc-workbench` is the closest model — `vitest.config.ts`, a plain `ray build`, published to the Store. It puts tests in a root `tests/`, which this spec deliberately does not copy: that placement falls outside `tsconfig`'s `include: ["src"]`, so its tests are silently un-type-checked. Tests here are **co-located under `src/`**, where they are type-checked under the same strict settings as source, and where `ray build` still never bundles them — nothing in the command's import graph reaches a `.test.ts`.

### The coverage bar, as a rule

> Every member of each returned union is produced by at least one fixture, and each known trap gets an explicitly named test.

Stated as a rule rather than a list so that a branch added later drags its own test in with it.

### Eleven cases across three modules

```
parseTrace(status, body)                                     5
  ok                    ← captured claude.ai trace (200)
  ok, IPv6              ← same shape, v6 ip=
  blocked "status"      ← 403 challenge HTML
  blocked "not-a-trace" ← 200, valid trace, h=example.com     ⭐ trap
  blocked "not-a-trace" ← 200, captive-portal HTML

parseGeo(json)                                               3
  ok                    ← captured ipwho.is body, fields-trimmed
  failed                ← 200 + {"success":false}             ⭐ trap
  ok, isp omitted       ← empty connection.isp, segment dropped

nextState(prev, trace)                                       3
  same IP     → ok, location line unchanged
  changed IP  → ip-only(new ip, country from loc=)
  failure     → replaces the healthy card
```

`unreachable` gets no fixture — it is the `catch` in a three-line wrapper, and it is observed by hand with the wifi off.

The provider's over-quota response gets no fixture either. It was never triggered during research, so its shape is an assumption rather than a measurement — but the geo design folds over-quota into the single degraded state, so it exercises the same branch as any other geo failure. The gap closes by elimination rather than by inventing a body.

### The fixtures, verbatim

Real captured bytes, with `ip=` redacted to RFC 5737 TEST-NET-3 so no personal exit IP is committed to a Store-bound repo. All 16 Cloudflare keys are kept, so a future key rename or reordering surfaces as a failing test rather than a wrong card.

**`trace-ok.txt`** — captured live from `claude.ai/cdn-cgi/trace`; only `ip=` altered. (`uag=` reflects the `curl` used to capture it; the extension's own requests will differ, and nothing parses that key.)

```
fl=467f175
h=claude.ai
ip=203.0.113.9
ts=1785164923.000
visit_scheme=https
uag=curl/8.7.1
colo=SJC
sliver=none
http=http/2
loc=US
tls=TLSv1.3
sni=plaintext
warp=off
gateway=off
rbi=off
kex=X25519
```

**`trace-ok-v6.txt`** — the same body with `ip=2001:db8::1`.

**`trace-wrong-host.txt`** — **invented.** A well-formed trace whose `h=` is not `claude.ai`; identical to `trace-ok.txt` but for `h=example.com`. Mark it invented in a comment: no real middlebox produced it.

**`trace-captive-portal.html`** — **invented.** Any short HTML login page; parsed at status 200.

**`trace-challenge-403.html`** — **invented.** Any short HTML body; parsed at status 403.

**`geo-ok.json`** — from a real capture, reduced to the production field set by dropping the two keys this spec's request doesn't ask for (`region`, `flag`). **Note the absence of a `success` key** — that absence is the whole point of the fixture:

```json
{"country":"United States","country_code":"US","city":"San Jose","connection":{"asn":31898,"org":"Oracle Public Cloud","isp":"Oracle Corporation","domain":"oracleemaildelivery.com"}}
```

**`geo-reserved.json`** — captured live with the production field set, HTTP 200:

```json
{"ip":"10.0.0.1","success":false,"message":"Reserved range"}
```

**`geo-no-isp.json`** — **invented.** `geo-ok.json` with `connection.isp` empty, to prove the segment is dropped rather than rendered blank.

---

## Acceptance

**Two stages. Green is not done.**

### Stage 1 — the machine gate (agent, headless)

Four scripts, in order, all green:

```
npm run lint        # ray lint — eslint + prettier
npm run type-check  # tsc --noEmit — the only one that covers the test files
npm test            # vitest run — 11 cases
npm run build       # ray build — bundles and type-checks the entry graph
```

`type-check` earns its place because `ray build` type-checks from the command entry graph, which never imports a `.test.ts` — without it, a type error confined to a test surfaces only when vitest happens to run. (`ray build` does type-check by default; it exposes `--skip-types` to opt out.)

Tests are **not** chained into `build`: `npm run publish` runs a build, and a Store publish must never depend on a test run.

**The agent closing stage 1 reports the gates green and explicitly does not claim any card state was seen.**

### Stage 2 — the human sweep (in Raycast)

Raycast state cannot be observed headlessly. A human runs `npm run dev` and confirms:

1. `loading` → `ip-only` → `success`, watched through in one launch.
2. `geo-failed`, forced.
3. `blocked`, forced.
4. `unreachable` — wifi off.
5. All four actions fired: clipboard payloads correct and **free of flag emoji**; Copy IP + Location hidden on `ip-only` and present on `geo-failed`; Refresh primary on both failure cards.
6. `⌘R` with an unchanged IP — location line does not move.
7. `⌘R` after switching VPN node — card drops to `ip-only`, then refills.

The extension is accepted only after stage 2. A failure there reopens the build session; it does not become a new ticket.

### Forcing each state — the recipe

One-line temporary edits, reverted after looking. There is deliberately **no shipped escape hatch**: a `__FORCE_STATE` constant would be test-only code in an extension that ships no preferences at all.

| To see | Temporary edit |
|---|---|
| `geo-failed` | point the geo host at an unroutable name |
| `blocked`, non-2xx | point the trace host at a URL that 404s |
| `blocked`, 2xx not-a-trace | point the trace host at `example.com` |
| `unreachable` | turn wifi off — no edit needed |
| `loading` / `ip-only`, held open | `await new Promise(r => setTimeout(r, 2000))` before the geo call |

The last row matters. The progressive render is ~0.4s on a healthy network — too fast to judge by eye, and the temptation is to tick it unseen.

---

## Out of Scope

Ruled out while naming the destination. Each returns only as a fresh effort, not a resumption of this one.

- **Reachability probe** — whether this machine can reach `claude.ai` / `api.anthropic.com`, and how fast.
- **Anthropic incident feed** — `status.claude.com` and service-status providers.
- **Region-supported verdict** — judging whether Anthropic serves the exit country.
- **Comparison rows** — a general exit IP, or `api.anthropic.com`'s exit IP, shown alongside Claude's.
- **Menu bar command** — `mode: menu-bar`, background refresh, glanceable bar item.
- **Chinese / bilingual UI** — the reference card's Chinese labels. English-only is a Store rule here, not a preference.
- **Raycast Store submission** — metadata screenshots, the review checklist, the PR to `raycast/extensions`.
- **Screenshot parity with the reference card** — the card is *styled after* it, not a reproduction; correct wording beats matching wording.

---

## Further Notes

### Assumptions this spec inherits, stated so they aren't mistaken for findings

1. **`marcuslannister` is unverified as a *Raycast* handle.** It is the GitHub handle, and the two are commonly the same, but they can differ and `author` must be the Raycast one. A wrong value fails at publish time, not at build time — so it is a submission-time check (`raycast.com/marcuslannister`), and submission is out of scope.
2. **Anthropic's own trademark policy was never read.** Research established only that *Raycast* has no trademark or logo policy. The icon decision rests on peer precedent — `claude-sessions`, `claude-code-launcher`, `claudecast`, and 548 brand-named icons corpus-wide, all shipping unchallenged — not on Anthropic's terms.
3. **`platforms: ["macOS"]` is narrower than the code requires.** Nothing here is macOS-specific — it is `fetch` plus React — but declaring a platform this machine cannot exercise would put an unverifiable claim in the manifest. Widening later is a non-breaking manifest edit.

### Prior art, read-only

- `~/Projects/Raycast/extensions/extensions/ipcheck-ing` — closest sibling (jason5ng32, MIT). Source of the approach, credited in the README, **not** of any code. Its geo client contains the `response.ok` bug this spec guards against.
- `~/GitHub/MyIP` — the same author's web app; `IPCard.vue` is the card in the reference screenshot.
- `https://ip.net.coffee/claude/` — prior art and the source of the reference screenshot. **Its `/api/` paths are `Disallow`ed in `robots.txt`** — read it for the field set, never call it from the extension.

Both repos are read-only inputs. Never edit them.

### Prototype

`.scratch/claude-exit-ip/prototype/` is a throwaway Raycast extension that settled the layout: four variants, six states, hardcoded fixtures, invented copy, a borrowed placeholder icon. Its markdown templates are transcribed above; its code is not the build. **Delete the directory now that this spec exists.**

### Two spellings that are traps

Collected in one place because both are cases where the obvious code is the wrong code, and both would produce a card that looks fine:

1. `json.success === false` — **not** `!json.success`, which fails every healthy lookup, and not `json.success === true`, which fails the same way.
2. `AbortSignal.any([hookSignal, AbortSignal.timeout(5000)])` — **not** a bare `AbortSignal.timeout(5000)`, which drops the hook's signal and silently voids the abort ordering.
