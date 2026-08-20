# Architecture

Caviarde reads the clipboard, replaces personal data with placeholders, and
pastes the result. No interface, and nothing leaves the machine by default.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript, strict | Raycast's extension language |
| Extension API | `@raycast/api`, `no-view` command | The only runtime dependency |
| HTTP | Native `fetch` with `AbortSignal.timeout` | An HTTP client library would be one more supply chain for one POST |
| Deterministic detection | Hand-written regex plus checksum validation | Sub-millisecond, no dependency, and it must keep working when the detector is down |
| Semantic detection | A PasteGuard detector over HTTP | See `security-notes.md` |
| Tests | Vitest | TypeScript with no build step |
| Lint | `@raycast/eslint-config` | Required to publish to the Raycast store |
| Package manager | pnpm | Exact pins plus a lockfile |

Runtime dependencies stay at exactly one. Luhn, IBAN mod-97, SIREN and SIRET are
written here rather than pulled in: adding a package to save forty lines would
widen the supply chain of a tool whose whole job is handling sensitive text.

### Pinning

Dependencies are declared at exact versions, with no `^` or `~`; `save-exact` in
`.npmrc` keeps future additions exact; `packageManager` and `.nvmrc` pin pnpm and
Node; the detector image is pinned by digest. A lockfile records what a resolve
produced once, while an exact manifest states what is allowed at all, so a fresh
resolve on another machine cannot widen a range.

One qualification: pnpm auto-installs peer dependencies, so the tree contains
packages that no manifest here declares (Prettier arrives that way, through the
Raycast ESLint config). Those are pinned by the lockfile alone.

## The commands

Two. `Mask and Paste` is `no-view` and does the work. `Set up Detector` is a
`view` command that starts the optional local detector, so a user who installed
from the store never has to open a terminal; it needs a window because pulling
the image takes minutes and a progress bar has to be shown somewhere.

```
Clipboard.readText()
  → guard: empty, whitespace-only, oversized
  → deterministic layer          (always)
  → semantic layer               (if reachable and the text is small enough)
  → merge spans
  → propagate first names
  → assign placeholders
  → replace right to left
  → Clipboard.paste
  → showHUD
```

Replacement runs right to left by descending offset, so an earlier substitution
never invalidates a later one.

## Modules

```
src/
  mask-and-paste.ts          command entry point
  preferences.ts             preference parsing, pure
  summary.ts                 HUD text
  detection/
    types.ts                 EntityType, Span
    deterministic.ts         regex and checksum layer, including @mentions
    semantic.ts              detector spans mapped to the local entity types
    coreference.ts           first-name propagation
    merge.ts                 overlap resolution
    validators/
      luhn.ts
      iban.ts                mod-97
      ip.ts                  address validity, and which ranges identify nobody
      french-business.ts     SIREN, SIRET
  setup-detector.tsx         the Set up Detector command
  detector/
    client.ts                the single HTTP module
    image.ts                 pinned digest, thresholds, docker probe paths
    docker.ts                container lifecycle
  masking/
    placeholders.ts          [TYPE_N] assignment
    apply.ts                 right-to-left replacement
```

Tests sit next to what they test.

The two command entry points are the only files that import `@raycast/api`. That
package has no entry point outside the Raycast runtime, so any module importing
it cannot be unit-tested; preference parsing therefore lives in `preferences.ts`
as pure functions and each command calls `getPreferenceValues()` itself.

`detector/client.ts` is the only file that knows the detector's endpoint, payload
and response shape. That contract is unversioned, so an upstream change is a
one-file fix.

## Detection

**Deterministic**, always, no network: emails, French and international phone
numbers, IPv4 and IPv6, IBAN (mod-97), credit cards and SIRET (Luhn), SIREN
behind a keyword guard, API keys, JWTs, PEM private keys, and `@mentions` as
person names.

**Semantic**, over HTTP, optional: people, places and street addresses, plus
company names when the detector runs the patch described in `detector-patch.md`.
The detector also runs its own structured pass, so it may return emails, phone
numbers, IBANs, cards, IP addresses and EU VAT numbers. That overlap is
deliberate: covering the same ground locally is what makes the degraded mode a
real mode rather than a disclaimer.

**First-name propagation** runs after the merge. When a full name has been
accepted, its first name is masked wherever it appears alone in the same text,
sharing the same placeholder. An isolated first name scores too low for any
usable threshold, but a full name elsewhere makes it certain.

### Merging

The detector's response is already sorted and internally non-overlapping, so the
only conflict is between layers.

1. Deterministic spans are accepted first.
2. A semantic span overlapping an accepted one is dropped whole, not trimmed.
   Trimming a person out of an email would leave the domain live.
3. Remaining semantic spans are accepted in descending length.

`merge.test.ts` covers identical spans from both layers, nesting in both
directions, partial overlap on each side, adjacent spans, spans at offset zero,
and independence from input order.

### Offsets

The detector returns UTF-16 code-unit offsets, converted server-side for
JavaScript consumers, so `text.slice(start, end)` is correct as-is including
around astral characters. Nothing converts them on this side.

## Placeholders

Format `[PERSON_1]`: single brackets, uppercase type, one counter per type,
1-indexed.

Assignment is deterministic within a single invocation. The same value gets the
same token, keyed on type and value, and the counter dies with the invocation.
There is no store and no reverse: the point is that a model can reason about
`PERSON_1` versus `PERSON_2`, not that anyone can undo it.

This is masking, not redaction. `redact` appears in no identifier.

## Size and timeout

The semantic layer costs roughly 150 ms plus 350 ms per kilobyte, single-threaded
behind a lock inside the detector.

- `detectorTimeoutMs` defaults to 3500. Paired with the cap below, the realistic
  worst case is around 2.2 s, which leaves margin on a loaded machine.
- The semantic layer is skipped above 6,000 characters, roughly a thousand words.
  Skipped, not truncated: truncating would mask a name in the first half of a
  document and leave the same name exposed in the second, which reads as
  protection that is not there. The HUD says detection was partial.
- Nothing is processed above 1,000,000 characters.

Empty and whitespace-only clipboards exit early and never call the detector.

## Failure is not an error

The semantic layer is optional at every step. Connection refused, timeout,
non-200, malformed JSON, a span outside the text bounds: each falls back to
deterministic-only, and the HUD says so. No path produces an error dialog or an
unmasked paste.

```
3 masked: 2 names, 1 email
2 masked: 1 email, 1 IBAN (partial: names and places not checked)
Nothing to mask
Clipboard is empty
```

## Preferences

| Key | Type | Default |
|---|---|---|
| `detectorUrl` | text | `http://127.0.0.1:5002` |
| `detectorTimeoutMs` | text | `3500` |
| `authToken` | password | empty |
| `phoneRegions` | text | `FR` |
| `maskPersons` | checkbox | on |
| `maskLocations` | checkbox | on |
| `maskOrganizations` | checkbox | on |

Only the semantic types are toggleable; the structured types are ones you would
never want off in a masking tool. Entity names are validated against the known
set before being sent, because the detector answers an unknown name with an empty
result rather than an error.

## Zero content logging

No logging of clipboard text, detected values, spans or placeholder mappings, at
any level. Errors are reported by class and message, never with the text that
caused them. No telemetry, no analytics, no persistence.

## Out of scope

No rehydrate command, no deny-list or allow-list, no persistent mapping store, no
history. Plain text only: HTML and RTF clipboard flavours are ignored, which is
what makes the output suitable for pasting into a chat.

No hotkey is set in the manifest. Raycast hotkeys are assigned per command by the
user.
