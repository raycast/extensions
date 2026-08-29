# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Paywall Detection

### Content Gate
Markup that withholds a page's content behind a subscription, registration, metering, or consent requirement — a paywall, regwall, or consent/ad wall. The detector's job is to decide whether a fetched page is actually gated, which turns on whether a gate is *visible to the reader*, not merely present in the HTML (a readable page often ships inactive gate markup that JavaScript reveals only when a metering rule trips).

### Barrier
A specific DOM element that *is* a content gate — the subscription overlay, the "reserved for subscribers" block, the registration prompt. A barrier counts as evidence of a paywall only when it is **visible**: shown to a reader rather than hidden by an attribute, an inline or inline-stylesheet rule, an inert container, or a hidden ancestor. An inactive, hidden barrier is not evidence the page is gated.

### Paywall Signal
A single piece of evidence that a page is gated, carrying a weight. Signals are **conclusive** (a visible barrier element, or gating language in the rendered text) or **circumstantial** (a lone subscription keyword, a short body, a truncated ending). The distinction is load-bearing: a conclusive signal can convict a page on its own; circumstantial signals never reach the verdict threshold by themselves, because each has an innocent explanation. This asymmetry is deliberate — a false "paywalled" verdict is expensive (see Paywall Hopper), so only proven-visible or explicit-language evidence is allowed to be conclusive.

### Paywall Hopper
The named process that tries to retrieve gated content through a sequence of bypass methods (search-engine-crawler user agents, social referrers, and web archives), in priority order, returning the first that yields more content. It runs *after* detection concludes a page is paywalled. Because a wrong detection routes a readable article into this slow, multi-request path — and a retrieved copy can replace the reader's good content — the Hopper only accepts a replacement that is meaningfully longer than what was already parsed, which bounds the harm of a false-positive detection.
