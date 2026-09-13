# 09 — Actions and error copy

Parent: [map.md](../map.md)
Type: grilling
Status: resolved 2026-07-27
Blocked by: 07

## Question

What can the user do from the card, and what words appear when things go wrong?

Decide:

- The action panel: copy IP, copy the full "IP + location" line, open `claude.ai`, open a lookup page for the IP, refresh. Which make v1, which are cut, and the primary action + shortcuts.
- Whether copy uses `Clipboard` + a HUD or `Action.CopyToClipboard`.
- Exact English strings for each failure state defined in [04](04-source-and-fallback-decision.md) and [05](05-geo-decision.md) — a user seeing "blocked" must be able to tell whether the problem is their network, their proxy, or Cloudflare.
- Whether any `showToast` fires, or errors live entirely in the card.

## Note carried in from 07

[07](07-card-prototype.md) fixed the layout — `Detail`, markdown only, no metadata panel — and with it five copy slots whose words are yours:

1. **Caption**, under the rule on a healthy card. Placeholder: `The IP claude.ai sees you from`.
2. **Partial marker**, inline on the location line after the country, em-dash separated. Placeholder: `United States — country only`. Its position is fixed; 05 requires it be unmistakable, so wording that could pass for a legitimately sparse result fails the brief. Decide too whether it distinguishes rate-limited from unreachable.
3. **Failure titles**, one per state, rendered at full H1 in the slot the IP would occupy.
4. **Failure bodies**, one paragraph, in the location line's slot.
5. **Provenance footer**, replacing the caption on a failure card. Placeholders: `claude.ai/cdn-cgi/trace · HTTP 403` and `claude.ai/cdn-cgi/trace · no response`. This is where 04's "carry the status code" lands on screen — decide whether a bare code is the right register.

Also unworded: the `loading` H1, currently `…`. You may decide it should be empty, with `isLoading` carrying the whole signal.

Two constraints the layout imposes: there is **no metadata panel**, so ASN has nowhere to live except a Copy action (05 fetches it for exactly this); and the card has **no toast-shaped slot**, so any `showToast` is additive to a card that already states the failure.

The prototype at `.scratch/claude-exit-ip/prototype/` renders all six states with invented copy — useful for seeing how long a line runs before it wraps, not as a source of wording.

---

## Resolution — 2026-07-27

**Four actions, three clipboard payloads, five slots worded, no toasts.**

### Action panel

| Action | Shortcut | Payload |
|---|---|---|
| Copy IP | `⏎` (primary) | `104.28.51.12` |
| Copy IP + Location | `⌘⇧C` | `104.28.51.12 · United States · San Francisco · Cloudflare, Inc.` |
| Copy ASN | `⌘⇧A` | `AS13335` |
| Refresh | `⌘R` | — |

**Cut:** *Open claude.ai* (the card answers a question about claude.ai, it is not a launcher) and *Open a lookup page* (ships the user's exit IP to a third party the spec never vetted, to show them what the card already shows).

All three copies use **`Action.CopyToClipboard`**, not the sibling's `Clipboard.copy` + `showToast`. It writes and shows Raycast's own HUD and closes the window — what a Raycast user expects from `⏎` on a copy action. Accepted cost: the HUD's generic wording, so no `"IP Copied · 1.2.3.4"` echo of what was copied.

**No flag emoji in the clipboard.** 07's one-flag rule governs the card, not the paste; the emoji renders as tofu or a bare `US` in terminals, commit messages, and plain-text tickets. ASN is prefixed `AS` (ipwho.is returns a bare number) and omits the ISP name, which the other copy action already carries.

Degraded card: **Copy IP + Location** yields `104.28.51.12 · United States` — sparse but true, **no partial marker in the clipboard**. The marker exists so the *card* cannot overstate what it knows; a pasted line makes no such claim. **Copy ASN disappears** rather than copying an empty string.

### Per-state availability

| State | Actions (primary first) |
|---|---|
| loading | Refresh |
| ip-only | Copy IP |
| success | Copy IP · Copy IP + Location · Copy ASN · Refresh |
| geo-failed | Copy IP · Copy IP + Location · Refresh |
| blocked | Refresh |
| unreachable | Refresh |

The rule: **never copy a value still in flight, never copy a value you don't have.** Copy IP + Location and Copy ASN stay hidden during `ip-only` because geo is still resolving and an action whose payload silently changes at t≈1.0s is a small betrayal; on `geo-failed` they behave differently because geo is *settled* — pending and final are not the same condition.

On both failure cards **Refresh is primary**, so `⏎` does the one useful thing — which is also what both bodies just told the user to do.

Rejected: a **Copy Error Details** action on failure cards. The footer is bug-report material, but it is a fifth action for a rare case and short enough to read off screen.

### The five slots

**1 — Caption (healthy card):** `The IP claude.ai sees you from`

07's placeholder, shipped near-verbatim. Six words carrying the per-destination framing 06 bought with the name "Exit IP" — the only thing separating this from the four generic IP extensions already on the Store. Rejected: provenance-as-caption (`claude.ai/cdn-cgi/trace`), technical register in the one place the card should be human; provenance already earns its keep in slot 5.

**2 — Partial marker:** `🇺🇸 United States — location lookup failed`

**Cause-agnostic — it does not distinguish rate-limited from unreachable.** 05 collapsed every geo failure into one degraded state deliberately; re-splitting here would undo that for no gain, since the user's next move is identical in all cases and `success:false` often does not say why.

Not the placeholder `— country only`: that describes *coverage* and reads as a calm statement of fact, which is precisely the failure mode 05 warned about — a card that legitimately knows little would just say `United States`, so "country only" sits too close to normal to carry alarm. `location lookup failed` names a failure, so it cannot be misread, and stays cause-agnostic. Rejected: `— geo lookup failed` (jargon in the one human-facing line), `— partial` (says something is missing without saying what).

**3+4 — Failure title and body.**

*Blocked:*

> # Something answered, but not Claude
>
> The response didn't come from Claude's edge — usually a proxy, VPN, or captive portal answering in its place. Check that your proxy is running and you're signed in to the network, then refresh.

The body names all three suspects in likelihood order and does **not** guess which one it is: 04's taxonomy cannot tell a captive portal from a corporate proxy from a Cloudflare challenge, and a wrong guess sends the user down the wrong path. It also never says "claude.ai is down" — a 5xx lands here, but so does a hotel wifi login page, and blaming Anthropic for the hotel is the worse error.

*Unreachable:*

> # Couldn't reach claude.ai
>
> Nothing came back at all — your connection or proxy is down, or something is blocking `claude.ai` before it can respond. Check your network, then refresh.

The two titles are a deliberate opposition — *something answered* vs *couldn't reach* — so a user who meets both over time learns the distinction without reading a body.

The body **deliberately omits the 5-second timeout**. 04 folds DNS failure, connection refused, and TLS failure in alongside the timeout, and most return instantly; "no response within 5 seconds" would be false on the common path.

**5 — Provenance footer:** bare and monospace, in the caption's position. A bare status code is the right register — the body already said it in English; the footer serves whoever can act on the detail (debugging a proxy, filing a bug). Prose would re-say the body's job in a worse voice, and monospace demotes it so it never competes with the H1.

**Three footers, not 07's two** — blocked fires on *any* status, including 200 (an HTML challenge page or an `h=` mismatch), and a bare `HTTP 200` under "Something answered, but not Claude" reads like success:

| Case | Footer |
|---|---|
| Unreachable | `claude.ai/cdn-cgi/trace · no response` |
| Blocked, non-2xx | `claude.ai/cdn-cgi/trace · HTTP 403` |
| Blocked, 2xx, validation failed | `claude.ai/cdn-cgi/trace · HTTP 200 · not a claude.ai trace` |

The third is where 04's `h=` check — "the one that isn't obvious" — surfaces on screen.

### Loading H1

**Empty markdown, `isLoading={true}`.** No `…`, no skeleton, no caption. A large glyph that exists for 0.4s and is then swapped for different large content draws the eye to the one moment it shouldn't; Raycast's loading bar is the first-class idiom and duplicating it inside the card undoes 07's strip-down. Rejected: caption-only frame for stability — a rule and a caption with nothing above them look broken, not loading. The blank flash is real but ~0.4s, matching Raycast's own commands.

### Toasts

**None. The card is the only error surface.** Both failure states own the whole card at three levels of detail; a toast is a fourth statement of a failure the user is staring at, overlaid on the message it duplicates. Toasts earn their place when the failure happens where the user is *not* looking. Success needs none either — `Action.CopyToClipboard` brings the HUD.

### Handed to 08

1. **Freshness suffix.** The caption is the natural home for one (`The IP claude.ai sees you from · updated 2m ago`) if 08 decides staleness must be visible. Left open deliberately rather than reserved blind.
2. **The no-toast rule is conditional.** It holds only while a failed fetch *replaces* the card. If 08 keeps the last-good card on screen after a failed refresh, the card no longer states the failure and a toast becomes the only place it can live.
