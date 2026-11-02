# Concepts

Shared domain vocabulary for this project: entities, named processes, and status concepts with project-specific meaning. Update it as implementation lessons clarify these terms. Glossary only, not a specification.

## Paywall Detection

### Content Gate
Markup that withholds a page's content behind a subscription, registration, metering, or consent requirement — a paywall, regwall, or consent/ad wall. The detector's job is to decide whether a fetched page is actually gated, which turns on whether a gate is *visible to the reader*, not merely present in the HTML (a readable page often ships inactive gate markup that JavaScript reveals only when a metering rule trips).

### Barrier
A specific DOM element that *is* a content gate — the subscription overlay, the "reserved for subscribers" block, the registration prompt. The detector counts a matching element unless its static visibility checks recognize it as hidden. Those checks cover hidden attributes, inline hiding styles, simple class and ID hiding rules in inline stylesheets, inert containers, and hidden ancestors; they don't establish actual browser visibility, since external stylesheets aren't evaluated.

### Paywall Signal
A single piece of evidence that a page is gated, carrying a weight. Signals are **conclusive** (a visible barrier element, or gating language in the rendered text) or **circumstantial** (a lone subscription keyword, a short body, a truncated ending). The distinction is load-bearing: a conclusive signal can convict a page on its own; circumstantial signals can reach the numeric score threshold, but can't produce a paywalled verdict without at least one conclusive signal, because each has an innocent explanation. This asymmetry is deliberate — a false "paywalled" verdict is expensive (see Paywall Hopper), so only barrier elements not recognized as hidden, or matching gating language, are allowed to be conclusive.

### Paywall Hopper
The named process that tries to retrieve gated content through a sequence of bypass methods (Googlebot, Bingbot, a social referrer, WallHopper, archive.is, and the Wayback Machine), in order, returning the first candidate the caller's validator accepts. It runs after soft-paywall detection, after a blocked fetch when the browser fallback fails, or from a direct action. A wrong detection routes a readable article into this slow, multi-request path, and a retrieved copy can replace the reader's good content, so on the soft-paywall path a replacement must hold meaningfully more text than what was already parsed, which bounds the harm of a false-positive detection. The blocked and direct paths have no existing article to beat.

## Content Extraction

### Data Payload
The JSON a server-rendered web app (Nuxt, Next.js) ships inside the page for the page to render from, read as a second source of the article alongside the visible page. Some publishers render a teaser from a payload that still holds the whole article, so the payload can recover what the visible page withholds.

A payload article must open with a paragraph the page shows. When the visible page also yields an article, the payload replaces it only if it contains at least half of it and holds substantially more; when the visible page yields nothing, the opening match alone decides. These checks reduce the chance of a comment list or story card taking the article's place but don't rule it out. When it holds far more than the page shows, the article counts as **recovered from the payload**, and the page's gate markup, which describes the teaser, is no longer weighed as a Paywall Signal against it.
