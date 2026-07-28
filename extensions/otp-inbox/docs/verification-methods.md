# OTP Inbox – Verification Methods Pipeline

This document defines the safety-critical pipeline used by OTP Inbox to derive user actions from a Gmail MIME message. It is written before the implementation so that the code, tests, and README can be checked against it.

## Goals

1. Detect **exactly one unambiguous numeric OTP** (4–8 ASCII digits) from the visible email content.
2. Detect and rank **high-confidence HTTPS verification CTA links** without auto-opening anything.
3. Fail closed on ambiguity, malformed input, or missing safety signals.
4. Store only minimal, user-confirmed local patterns. Never store full URLs, tokens, bodies, or OTPs.

## Pipeline

```text
Gmail MIME payload
  -> recursive MIME-part traversal
  -> safe base64url decoding
  -> choose text/plain; retain text/html
  -> sanitize visible HTML fallback
  -> numeric OTP extraction
  -> structured anchor extraction from HTML
  -> sender parsing + registrable-domain comparison
  -> URL hard validation
  -> deterministic candidate scoring
  -> ambiguity resolution / abstention
  -> optional local remembered-pattern bonus
  -> typed result
  -> Raycast UI actions gated by final validators
```

## OTP invariants

- OTP characters: ASCII digits only.
- OTP length: 4 through 8 inclusive.
- Boundary-aware: never a substring of a longer digit sequence.
- Duplicate occurrences of the same code count as one candidate.
- Exactly one distinct candidate required; otherwise no OTP.
- Never infer from CSS, HTML attributes, links, dates, reference IDs, phone numbers, or arbitrary words.
- UI gate: `isValidOtp(value)` requires `^\d{4,8}$`.

## MIME precedence

1. Recursively traverse `multipart/*` parts.
2. Prefer the first meaningful non-empty `text/plain` body for OTP extraction.
3. Retain the first meaningful non-empty `text/html` body for link extraction.
4. If `text/plain` is absent, derive visible text from sanitized `text/html`.
5. Ignore attachments (`Content-Disposition: attachment`) for body text.
6. Malformed/missing parts return empty safely; no crash.

## HTML sanitization

- Parse with a real HTML parser (`node-html-parser`).
- Remove `head`, `style`, `script`, `noscript`, `template`, comments, SVG/math, and hidden attributes.
- Remove inline `style` attributes.
- Decode HTML entities and Unicode-normalize.
- Collapse whitespace.
- Produce clean visible text for OTP detection and the “Show Email Content” view.
- Produce a separate structured anchor list from the same parse.

## Link eligibility (hard rules)

- Scheme must be exactly `https:`.
- Reject `mailto:`, `tel:`, `javascript:`, `data:`, `file:`, custom schemes, and relative URLs.
- Candidate hostname must share the sender’s registrable domain, using a public-suffix-aware library (`tldts`).
- Visible anchor text must not contain strong negative/footer intent.
- Readable cross-domain redirect parameters (`redirect`, `redirect_uri`, `return`, `return_url`, `continue`, `next`, `target`, `destination`, `callback`, `url`) must stay within the sender’s registrable domain.
- Opaque/signed/encrypted parameters are ignored, not decoded or persisted.

## Scoring

| Rule | Points |
| --- | --- |
| Strong visible CTA phrase | +120 |
| Generic verification/auth wording | +65 |
| Verification intent in safe pathname or query-name | +35 |
| Same sender registrable domain | +30 |
| Appears before first footer marker | +15 |
| Exact learned local-pattern match | +20 |
| Partial learned match (same sender + host + CTA) | +10 |
| Invalid/non-HTTPS/unrelated domain/unsafe redirect | -1000 |
| Strong negative/footer intent | -500 |
| No meaningful visible text | -100 |
| Likely tracking host/path | -75 |
| Generic “click here” without strong path intent | -40 |

- Automatic selection threshold: `score >= 130`.
- Automatic selection margin: at least `30` points above the second-best distinct eligible candidate.
- Learned patterns add only bounded bonuses and never override hard eligibility.

## Ambiguity

If no candidate meets the threshold/margin, the result is ambiguous. The UI shows a “Choose Verification Link…” chooser with only eligible candidates. The default action is safe (inspect / no-op). No link is opened or remembered automatically.

## Local learning

- Storage: Raycast `LocalStorage`.
- Persisted fields only: `version`, `id`, `senderAddress`, `senderRegistrableDomain`, `targetHostname`, `normalizedCtaText`, `pathSignature`, `createdAt`, `lastUsedAt`, `useCount`.
- Never persisted: full URLs, query strings, tokens, bodies, subjects, message IDs, OTPs, sender display name.
- Created only after explicit user confirmation via `confirmAlert`.
- Patterns expire after 180 days of non-use.
- A pattern matches only on exact normalized sender mailbox, sender registrable domain, target hostname, normalized CTA text, and path signature.
- Patterns cannot bypass hard eligibility rules.

## UI guarantees

- Verification links are opened only by explicit `Action.OpenInBrowser` invocation.
- OTPs are pasted/copied only when `isValidOtp` passes.
- No form submission or keystroke automation.
- No network requests to validate candidate links.
- No LLM, analytics, or remote service is used.
