# 04 — Exit-IP source and fallback chain

Parent: [map.md](../map.md)
Type: grilling
Status: resolved
Blocked by: 01

## Question

Given what [01](01-claude-exit-ip-source.md) found, which endpoint does the extension call, and what does it do when that call fails?

Decide:

- The primary endpoint, and the exact parse (which line/field, what validation).
- Whether there is a fallback, and if so what a fallback IP *means* on a card labelled "the IP Claude sees" — a different host's exit IP may be a different answer to a different question. Showing it silently would be a lie; showing nothing may be less useful. Pick, and say why.
- Timeout budget for a view command that must feel instant.
- How a Cloudflare challenge, a 403, or an HTML body is distinguished from a real answer, so the card can say "blocked" rather than rendering garbage.

Not this ticket: how the failure is *worded* or *drawn* — that's [09](09-actions-and-copy.md) and [07](07-card-prototype.md).

## Note carried in from 01/02

Provenance, now narrow enough to settle here: the only ipcheck-ing code worth reusing is the trace parse itself (split on `\n`, find `ip=`), since 02 established its geo client is not reusable. ipcheck-ing is MIT. Decide whether that one-liner is copied with attribution or simply written fresh — and note the answer so [10](10-write-spec.md) can record provenance without reopening the question.

## Answer

**Single source, three states, 5s budget.**

### Source

`https://claude.ai/cdn-cgi/trace`, once, no fallback host.

All three Anthropic hosts returned the identical IP when measured in [01](01-claude-exit-ip-source.md), so a second call buys nothing on the happy path. And on the unhappy path a fallback would actively mislead: this card claims to show what *Claude* sees, so answering it with `www.anthropic.com`'s exit IP under the same label would be a quiet lie whenever the two diverge. If `claude.ai` can't answer, the card says so rather than substituting a different question's answer.

Consequence for [07](07-card-prototype.md): there is no "which host answered" line to draw, because there is only ever one host.

### Parse and validation

Body is Cloudflare's `key=value\n` block. Accept the response as a real trace only when **all** of:

1. The body contains a line matching `^ip=`.
2. The value right of `=` passes IP validation (v4 or v6) — reuse the regex shape from `ipcheck-ing/src/getExternalIP.ts`.
3. The body contains `h=claude.ai`.

Check 3 is the one that isn't obvious and is worth keeping: `h=` echoes the host whose edge served the response, so it proves the answer came from Cloudflare's `claude.ai` edge rather than from a captive portal, a transparent proxy, or a middlebox that returned *something* parseable. Without it, a network that injects its own response could put a plausible-looking IP on the card.

Also capture `loc=` in the same pass — it carries the country code that [05](05-geo-decision.md) needs for the degraded card.

### Failure taxonomy — three states

| State | Detected by | Meaning to the user |
|---|---|---|
| **OK** | all three validation checks pass | here is the IP Claude sees |
| **Blocked** | the request completed (any HTTP status) but validation failed — challenge page, HTML, 5xx, or a trace whose `h=` isn't `claude.ai` | something answered, but it wasn't Claude's edge — proxy or network interference |
| **Unreachable** | the request never completed — DNS failure, connection refused, TLS failure, or the 5s timeout firing | nothing answered — network or proxy is down |

The rule is simply *did we get a response at all*, then *is that response genuinely Cloudflare's `claude.ai` trace*. Timeouts fold into **unreachable** rather than getting their own state: a proxy that hangs and a proxy that's down call for the same next action.

Carry the HTTP status code into the blocked state so [09](09-actions-and-copy.md) can word it concretely.

### Timeout

**5 seconds** on the whole trace request, via `AbortSignal.timeout(5000)`.

13× the 0.38s measured happy path — enough slack for a cold DNS lookup or a sluggish proxy, short enough that a dead proxy doesn't feel like a hang. Matches what the prior-art page budgets for its own probes. This covers the trace call only; the geo call's budget belongs to [05](05-geo-decision.md).

### Provenance

**Written fresh; no copied code, so no MIT attribution obligation is incurred.** The reusable part of `ipcheck-ing` turned out to be a two-line split-and-find plus an IP regex, and [02](02-geo-provider-options.md) established its geo client is not reusable at all. `ipcheck-ing` should still be credited as prior art in the spec's provenance section — accurate about where the approach came from, without taking on a license notice for a one-liner.

(This last point was my call, not the user's — it was too small to be worth a question, and it is reversible by adding an attribution line if you'd rather be generous.)
