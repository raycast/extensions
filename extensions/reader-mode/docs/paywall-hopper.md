# Paywall Hopper — Technical Specification

> **Feature:** Fallback content retrieval for paywalled articles  
> **Status:** Planning  
> **Branch:** `paywall-hopper`

---

## Overview

The Paywall Hopper provides intelligent fallback content retrieval when articles are behind paywalls. It uses a **tiered approach** that respects paying subscribers while offering alternatives for non-subscribers.

### Goals

1. Detect when fetched content is paywalled or truncated
2. Provide multiple bypass strategies in priority order
3. Respect users who are paying subscribers (prioritize browser tab import)
4. Annotate retrieved content with source attribution
5. Make the feature optional via preferences

---

## Research Summary

### Techniques Evaluated

| Technique              | Description                                 | Reliability | Notes                                 |
| ---------------------- | ------------------------------------------- | ----------- | ------------------------------------- |
| **Googlebot UA**       | Fetch with search engine crawler User-Agent | High        | Many sites serve full content for SEO |
| **archive.is**         | Fetch from archive.is/archive.today         | High        | Best for recent paywalled content     |
| **Wayback Machine**    | Fetch from web.archive.org                  | Medium      | Broader coverage, may be outdated     |
| **Jina.ai**            | Markdown extraction service                 | Medium      | Future enhancement                    |
| **Browser Tab Import** | Use authenticated session                   | High        | For paying subscribers                |

### Key Insights

#### 13ft Technique (Googlebot User-Agent)

From [wasi-master/13ft](https://github.com/wasi-master/13ft):

```typescript
const GOOGLEBOT_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.6533.119 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
```

Many paywalled sites serve full content to Googlebot for SEO indexing. This is our **first-line bypass** before hitting archive services.

#### SMRY.ai Architecture

From [mrmps/SMRY](https://github.com/mrmps/SMRY):

- Multi-source parallel fetching with first-success strategy
- Fallback chain: Direct → Wayback → Jina.ai
- Cache the longest/best content version
- Track extraction steps for debugging

#### Bypass Paywalls Clean

From [magnolia1234/bypass-paywalls-clean-filters](https://gitflic.ru/project/magnolia1234/bypass-paywalls-clean-filters):

- Domain-specific paywall patterns
- CSS selectors for paywall overlays
- Cookie manipulation techniques

---

## Architecture

### Integration with Existing Codebase

The Paywall Hopper integrates with the existing extractor pattern rather than creating parallel detection logic.

```text
src/
├── extractors/
│   ├── _base.ts          # Add isPaywalled(), getPaywallSelectors()
│   ├── medium.ts         # Add Medium-specific paywall detection
│   └── ...
├── utils/
│   ├── article-loader.ts # Integrate Paywall Hopper into load flow
│   ├── fetcher.ts        # Add fetchHtmlAsGooglebot()
│   ├── paywall-hopper.ts # NEW: Orchestrate bypass attempts
│   └── archive-fetcher.ts # NEW: Fetch from archive services
└── types/
    └── article.ts        # Add archiveSource field
```

### Extractor Extension

Extend `BaseExtractor` with paywall detection:

```typescript
abstract class BaseExtractor {
  // ... existing methods ...

  /**
   * Detect if the page appears to be paywalled.
   * Override in site-specific extractors for accurate detection.
   */
  isPaywalled(): boolean {
    return this.detectGenericPaywall();
  }

  /**
   * Get paywall-specific CSS selectors for this site.
   */
  getPaywallSelectors(): string[] {
    return [];
  }

  /**
   * Generic paywall detection heuristics.
   */
  protected detectGenericPaywall(): boolean {
    // Check for common paywall indicators
    // - Short content with truncation markers
    // - Paywall overlay elements
    // - "Subscribe" CTAs in content area
  }
}
```

---

## User Flows

### Flow 1: Non-Subscriber (Paywall Hopper Enabled)

```text
1. User requests article URL
2. Fetch article with normal User-Agent
3. Parse with Readability
4. Extractor.isPaywalled() returns true
5. Try Googlebot User-Agent fetch
   └─ Success? → Parse & display with "Retrieved via Googlebot" note
6. Try archive.is
   └─ Success? → Parse & display with archive link annotation
7. Try Wayback Machine
   └─ Success? → Parse & display with archive link annotation
8. All failed → Show paywall message with options
```

### Flow 2: Subscriber (Has Browser Tab Open)

```text
1. User requests article URL
2. Fetch article with normal User-Agent
3. Parse with Readability
4. Extractor.isPaywalled() returns true
5. Check if URL is open in browser tab
   └─ Tab found → Prompt "Import from Browser Tab" (uses logged-in session)
6. User imports from browser → Full content displayed
7. Alternative: User chooses "Try Paywall Hopper" instead
```

### Flow 3: Subscriber (No Browser Tab)

```text
1. User requests article URL
2. Fetch article with normal User-Agent
3. Extractor.isPaywalled() returns true
4. No matching browser tab found
5. Show options:
   - "Open in Browser & Import" (primary)
   - "Try Paywall Hopper" (secondary)
6. User opens in browser, logs in, then imports
```

---

## Paywall Detection

### Generic Heuristics

Applied when no site-specific extractor exists:

| Signal             | Weight | Description                                            |
| ------------------ | ------ | ------------------------------------------------------ |
| Short content      | High   | Article body < 500 chars                               |
| Truncation markers | High   | "Continue reading...", "Read more...", ellipsis at end |
| Paywall keywords   | Medium | "Subscribe", "Sign in", "Members only", "Premium"      |
| Overlay elements   | Medium | `[class*="paywall"]`, `[class*="subscribe-wall"]`      |
| Login prompts      | Medium | "Sign in to continue reading"                          |
| Metered message    | Low    | "You have X free articles remaining"                   |

### Site-Specific Detection

Implemented in extractors:

```typescript
// Example: MediumExtractor
class MediumExtractor extends BaseExtractor {
  isPaywalled(): boolean {
    // Medium-specific: check for "Member-only story" badge
    const memberBadge = this.querySelector('[data-testid="storyMemberOnlyBadge"]');
    if (memberBadge) return true;

    // Check for paywall modal
    const paywallModal = this.querySelector('[data-testid="paywall-modal"]');
    if (paywallModal) return true;

    return this.detectGenericPaywall();
  }

  getPaywallSelectors(): string[] {
    return ['[data-testid="storyMemberOnlyBadge"]', '[data-testid="paywall-modal"]', ".meteredContent"];
  }
}
```

### Soft Paywall Detection (200 OK with Preview Content)

Some sites like **NYTimes** return HTTP 200 OK but serve truncated/preview content with paywall messaging embedded in the article body. This requires **post-parse text analysis** since the HTTP response looks successful.

#### How It Works

1. After successful fetch and parse, check if the site is in `isKnownPaywalledSite()` list
2. Scan the parsed `textContent` for paywall keyword patterns
3. If detected, trigger Paywall Hopper bypass methods
4. Compare bypassed content length to original (require **20% improvement** to use)
5. Fall back to original content if bypass doesn't improve

#### Implementation

The detection happens in `src/utils/paywall-detector.ts`:

```typescript
import { PAYWALL_KEYWORDS, isKnownPaywalledSite } from "../extractors/_paywall";

export function detectPaywallInText(textContent: string, url: string): PaywallTextDetectionResult {
  // Only check known paywalled sites to avoid false positives
  if (!isKnownPaywalledSite(url)) {
    return { isPaywalled: false, url };
  }

  // Check for paywall keywords in the content
  for (const pattern of PAYWALL_KEYWORDS) {
    if (pattern.test(textContent)) {
      return { isPaywalled: true, matchedPattern: pattern.source, url };
    }
  }

  return { isPaywalled: false, url };
}
```

#### Adding a New Site with Soft Paywall

To add detection for a new site that uses this pattern:

**Step 1:** Add the domain to `isKnownPaywalledSite()` in `src/extractors/_paywall.ts`:

```typescript
const knownPaywalledDomains = [
  "wsj.com",
  "nytimes.com",
  "washingtonpost.com",
  // Add your new site here:
  "example.com",
];
```

**Step 2:** Add site-specific text patterns to `PAYWALL_KEYWORDS` in `src/extractors/_paywall.ts`:

```typescript
export const PAYWALL_KEYWORDS: RegExp[] = [
  // Generic patterns (work across many sites)
  /subscribe now/i,
  /already a (?:subscriber|member)\?/i,
  /you(?:'ve| have) (?:reached|used) your (?:free )?(?:article|story) limit/i,

  // NYTimes-specific patterns
  /you have a preview view of this article/i,
  /thank you for your patience while we verify access/i,

  // Add your new site's patterns here:
  /your site's specific paywall message/i,
];
```

**Step 3:** (Optional) Add DOM selectors if the site also has paywall overlay elements:

```typescript
export const SITE_PAYWALL_SELECTORS: Record<string, string[]> = {
  "example.com": ['[class*="paywall"]', ".subscription-required"],
};
```

#### Example: NYTimes Soft Paywall

NYTimes serves preview content with these markers:

```text
You have a preview view of this article while we are checking your access.
...
Thank you for your patience while we verify access.
Already a subscriber? Log in.
Want all of The Times? Subscribe.
```

The patterns added to detect this:

```typescript
/you have a preview view of this article/i,
/thank you for your patience while we verify access/i,
/please exit and log into your Times account/i,
/want all of The Times\? Subscribe/i,
```

---

## Archive Service Integration

### archive.is / archive.today

```typescript
async function fetchFromArchiveIs(url: string): Promise<ArchiveFetchResult> {
  // archive.is stores snapshots and serves them
  const archiveUrl = `https://archive.is/newest/${encodeURIComponent(url)}`;

  const response = await fetch(archiveUrl, {
    timeout: ARCHIVE_IS_TIMEOUT_MS,
    redirect: "follow",
  });

  // archive.is redirects to the actual snapshot URL
  const snapshotUrl = response.url;
  const html = await response.text();

  return {
    success: true,
    html,
    archiveUrl: snapshotUrl,
    service: "archive.is",
  };
}
```

### Wayback Machine

```typescript
async function fetchFromWayback(url: string): Promise<ArchiveFetchResult> {
  // Wayback Machine API to find latest snapshot
  const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
  const apiResponse = await fetch(apiUrl);
  const data = await apiResponse.json();

  if (!data.archived_snapshots?.closest?.url) {
    return { success: false, error: "No snapshot available" };
  }

  const snapshotUrl = data.archived_snapshots.closest.url;
  const html = await fetch(snapshotUrl).then((r) => r.text());

  return {
    success: true,
    html,
    archiveUrl: snapshotUrl,
    service: "wayback",
    timestamp: data.archived_snapshots.closest.timestamp,
  };
}
```

---

## Constants & Configuration

```typescript
// Timeouts (archive services can be slow)
export const FETCH_TIMEOUT_MS = 30000; // Normal fetch (existing)
export const GOOGLEBOT_TIMEOUT_MS = 15000; // Googlebot fetch
export const ARCHIVE_IS_TIMEOUT_MS = 45000; // archive.is can be slow
export const WAYBACK_TIMEOUT_MS = 30000; // Wayback Machine

// User Agents
export const GOOGLEBOT_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/127.0.6533.119 Mobile Safari/537.36 " +
  "(compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// Paywall detection thresholds
export const MIN_ARTICLE_LENGTH = 500; // Chars below this = likely truncated
export const TRUNCATION_PATTERNS = [
  /continue reading/i,
  /read more/i,
  /subscribe to/i,
  /sign in to continue/i,
  /members only/i,
  /\.\.\.$/, // Ends with ellipsis
];
```

---

## UI Changes

### Preferences

Add to `package.json`:

```json
{
  "name": "enablePaywallHopper",
  "title": "Paywall Hopper",
  "description": "Try to retrieve full content when articles are paywalled.",
  "type": "checkbox",
  "label": "Enable",
  "default": true,
  "required": false
}
```

### Article Annotations

When content is retrieved from an archive:

```markdown
> 📦 **Archived Copy** — Retrieved from [archive.is](https://archive.is/xxxxx) on Jan 3, 2026

# Article Title

Article content...
```

### Actions

New actions when paywall is detected:

| Action                    | Shortcut | Description                       |
| ------------------------- | -------- | --------------------------------- |
| Import from Browser Tab   | `⌘I`     | Use authenticated browser session |
| Open in Browser & Import  | `⌘O`     | Open URL, then import             |
| Try Paywall Hopper        | `⌘P`     | Attempt bypass methods            |
| Copy URL to Archived Copy | `⌘⇧C`    | Copy archive.is URL               |

### Toast Notifications

- "🔓 Retrieved via Googlebot" — When Googlebot UA worked
- "📦 Retrieved from archive.is" — When archive service worked
- "🔒 Paywall detected" — When paywall found, showing options

---

## Article State Extension

Extend `ArticleState` in `src/types/article.ts`:

```typescript
export interface ArticleState {
  // ... existing fields ...

  /** Source of archived content, if retrieved via Paywall Hopper */
  archiveSource?: {
    service: "googlebot" | "archive.is" | "wayback" | "browser";
    url?: string; // URL to the archived copy
    timestamp?: string; // When the archive was captured
    retrievedAt: string; // When we fetched it
  };
}
```

---

## Logging

New log events for debugging:

```typescript
// Paywall detection
paywallLog.log("paywall:detected", { url, signals: [...] });
paywallLog.log("paywall:not-detected", { url });

// Bypass attempts
paywallLog.log("bypass:googlebot:start", { url });
paywallLog.log("bypass:googlebot:success", { url, contentLength });
paywallLog.log("bypass:googlebot:failed", { url, reason });

paywallLog.log("bypass:archive-is:start", { url });
paywallLog.log("bypass:archive-is:success", { url, archiveUrl });
paywallLog.log("bypass:archive-is:failed", { url, reason });

paywallLog.log("bypass:wayback:start", { url });
paywallLog.log("bypass:wayback:success", { url, archiveUrl, timestamp });
paywallLog.log("bypass:wayback:failed", { url, reason });
```

---

## Testing

### Test URLs

| Site         | URL Type    | Expected Behavior                      |
| ------------ | ----------- | -------------------------------------- |
| WSJ          | Paywalled   | Googlebot or archive.is should work    |
| NYT          | Metered     | May work with Googlebot                |
| Medium       | Member-only | Extractor detects, archive.is fallback |
| The Atlantic | Paywalled   | Archive services                       |
| WaPo         | Metered     | Googlebot may work                     |

### Test Scenarios

1. **Paywall detected, Googlebot works** — Should show content with annotation
2. **Paywall detected, archive.is works** — Should show content with archive link
3. **Paywall detected, user has tab open** — Should prompt browser import
4. **Paywall detected, all methods fail** — Should show helpful error
5. **No paywall** — Normal flow, no bypass attempted
6. **Paywall Hopper disabled** — Should not attempt bypass

---

## Future Enhancements

- [ ] Jina.ai integration (reference [Webpage to Markdown](https://www.raycast.com/treyg/webpage-to-markdown))
- [ ] removepaywall.com as additional fallback
- [ ] Cache archive URLs for quick re-access
- [ ] Domain-specific bypass rules from Bypass Paywalls Clean
- [ ] Cookie manipulation techniques
- [ ] Google Cache (if still available)

---

## References

- [wasi-master/13ft](https://github.com/wasi-master/13ft) — Googlebot technique
- [mrmps/SMRY](https://github.com/mrmps/SMRY) — Multi-source fetching architecture
- [magnolia1234/bypass-paywalls-clean-filters](https://gitflic.ru/project/magnolia1234/bypass-paywalls-clean-filters) — Paywall patterns
- [nang-dev/hover-paywalls-browser-extension](https://github.com/nang-dev/hover-paywalls-browser-extension) — Browser extension approach (deprecated)
- [Paywall Bypass Script](https://greasyfork.org/en/scripts/495817) — Service list and patterns
- [Wallhopper](https://github.com/modularizer/WallHopper) — Bypass article paywalls with one line of javascript
