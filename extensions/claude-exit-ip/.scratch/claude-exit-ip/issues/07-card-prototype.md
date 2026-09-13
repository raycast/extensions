# 07 — The card: layout and states

Parent: [map.md](../map.md)
Type: prototype
Status: resolved
Blocked by: 04, 05

## Question

What does the command actually look like on screen?

Build a cheap, throwaway prototype (`/prototype`, UI mode) with hardcoded data — no real fetching — and react to it together. Then decide:

- `Detail` (markdown card, closest to the reference screenshot) or `List` (one row, Raycast-native, cheaper actions). The reference is a web card, not a Raycast card; the Raycast-native answer may differ.
- Where the IP, flag, and location line sit, and what typography Raycast actually allows there.
- Metadata panel: used or not, and with which fields.
- The four states drawn, not just described: loading, success, geo-missing, exit-IP-unavailable.

Link the prototype path under `## Answer`. The prototype is scratch — it is not the spec, and it is not the build.

## Note carried in from 02

If reproducing the reference screenshot glyph-for-glyph matters, the ISP wording is the catch: the prior art renders `Oracle Cl…` and only `api.ip.sb` reproduces that (`isp: "Oracle Cloud"`). The recommended ipwho.is says `Oracle Corporation` — correct, differently worded — and `ipapi.is` says `Oracle Public Cloud`. Decide whether the card matches the screenshot's words or simply reads well.

## Answer

**`Detail`, markdown only, no metadata panel — the reference-card shape.** Chosen from four variants rendered side by side in Raycast dev mode; the user cycled them live and picked A.

### The card

```
# 🇺🇸 129.146.12.34

United States · San Jose · Oracle Corporation

---

The IP claude.ai sees you from
```

Four slots, top to bottom: **H1 = flag + IP** (the largest type Raycast offers, and the answer the extension exists to give), **location line** as a plain paragraph, **horizontal rule**, **caption**. Nothing else — no metadata panel, no images, no colour. `Detail` markdown gives no colour control anyway; the hierarchy is carried entirely by heading level and the rule.

**No `Detail.Metadata`.** The panel variant was built and rejected: five labelled rows to the right restate a line the card already reads in prose, and it halves the width the ISP has before truncating. ASN was the only field the panel added, and [05](05-geo-decision.md) already routes ASN to a Copy action rather than the face of the card. This settles the ticket's open "metadata: used or not" as **not used**.

### One flag per card, attached to the IP

The flag sits in the H1 beside the IP and **never beside the country name**. The first prototype had it in both places, and the duplication was the user's first correction — a country rendered as `🇺🇸 United States` next to an IP already flagged `🇺🇸` reads as two facts when it is one.

This **overrides the illustrative rendering in [05](05-geo-decision.md)**, which wrote the line as `🇺🇸  United States · San Jose · Oracle Corporation`. 05's substance is untouched — flag computed locally from a two-letter code, one function serving both the healthy and degraded paths — only its position moves. The degraded card gets its flag from the trace's `loc=` exactly as 05 specified; it just lands in the H1.

### Six states, drawn

The ticket asked for four. Two split in the drawing, both along lines earlier tickets had already cut:

| State | H1 | Location line | Footer |
|---|---|---|---|
| **loading** | `…` | — | `Checking what claude.ai sees` |
| **ip-only** (t≈0.4s) | flag + IP | `United States` | caption |
| **success** (t≈1.0s) | flag + IP | `United States · San Jose · Oracle Corporation` | caption |
| **geo-failed** | flag + IP | `United States — country only` | caption |
| **blocked** | failure title | failure body | `claude.ai/cdn-cgi/trace · HTTP 403` |
| **unreachable** | failure title | failure body | `claude.ai/cdn-cgi/trace · no response` |

`ip-only` split out of loading because [05](05-geo-decision.md)'s progressive render makes it a state the user actually sees. `blocked` and `unreachable` split because [04](04-source-and-fallback-decision.md) made them different facts, and the footer proves it — the two failures differ in the footer's right-hand half and nowhere else.

### The loading line shows the country, not the word "Loading"

At t≈0.4s the trace has already returned `loc=US`, so the card paints **`United States`** immediately and the line **grows in place** when geo lands at t≈1.0s — `United States` → `United States · San Jose · Oracle Corporation`. No `Locating…` placeholder, no empty gap, no vertical jump: the line only ever gains segments.

The cost, accepted knowingly: for that ~0.6s window the card is visually identical to the `geo-failed` card minus its marker. That is tolerable precisely because the marker is what distinguishes them, which is the next decision.

### The partial marker is inline

```
geo ok      United States · San Jose · Oracle Corporation
geo failed  United States — country only
```

The marker sits on the line it qualifies, after the country, separated by an em dash. It cannot be read apart from the fact it qualifies, and it costs no vertical space. Rejected: a second italic line (more room for a sentence, but it makes the degraded card *taller* than the healthy one, which reads as the card having more to say when it has less) and repurposing the caption slot (puts the qualifier two lines away from the country it qualifies).

`country only` is placeholder text. **The wording is [09](09-actions-and-copy.md)'s**; what is fixed here is that it renders inline, on the location line, after the country name.

### The failure card keeps the frame and swaps the footer

```
# Couldn't reach claude.ai

Your network or proxy may be down.

---

claude.ai/cdn-cgi/trace · no response
```

Same four slots. The failure title takes the H1 slot the IP would hold — at full H1 weight, not demoted to H2, because a card that cannot answer its own question should say so at the same volume it would have answered. The body paragraph occupies the location line's slot.

The **caption slot becomes a provenance line**: what was called, and what came back. On a successful card "The IP claude.ai sees you from" tells the user what they are looking at; on a failed card it would restate a purpose the card visibly failed at, while the endpoint and the status code are the two facts that actually help. This is where [04](04-source-and-fallback-decision.md)'s "carry the HTTP status code into the blocked state" surfaces on screen.

### Screenshot parity: not pursued

The note carried in from 02 asked whether the card should reproduce the reference screenshot glyph-for-glyph, since only `api.ip.sb` renders `Oracle Cl…`. **It should not.** [05](05-geo-decision.md) already fixed the provider at ipwho.is and the field at `connection.isp` ("Oracle Corporation"), and the layout has since diverged further on purpose — region dropped, flag moved to the IP. The card is *styled after* the reference, not a reproduction of it; correct wording beats matching wording.

### Handed to [09](09-actions-and-copy.md)

The layout fixes five copy slots and owns none of their words:

1. Caption on a healthy card (`The IP claude.ai sees you from`)
2. Partial marker, inline after the country (`country only`)
3. Failure titles, H1, one per state
4. Failure bodies, one paragraph
5. Provenance footer, and whether it shows a bare status code or something friendlier

The `loading` H1 (`…`) is also unworded, and 09 may decide it should be blank with `isLoading` alone carrying the signal.

### The prototype

`.scratch/claude-exit-ip/prototype/` — throwaway Raycast extension, hardcoded fixtures, no fetching. All four variants and all six states remain switchable so the rejected options stay inspectable:

```
cd .scratch/claude-exit-ip/prototype && npm install && npm run dev
# then: raycast://extensions/marcuslannister/claude-exit-ip-prototype/prototype
# ⌘] / ⌘[ cycle layout   ⌘\ next state   ⌘1..⌘6 jump to a state
```

Not the spec and not the build: it borrows ipcheck-ing's icon as a placeholder, hardcodes `129.146.12.34`, and its failure copy is invented. [10](10-write-spec.md) transcribes the markdown templates above, not this code. Delete the directory once 10 is written.

**Verification honesty:** the build is verified (`tsc --noEmit` clean, `ray develop` → "built extension successfully"), but every visual judgment here is the user's — this session had no Screen Recording grant, so `screencapture` failed and no agent ever saw the rendered card.
