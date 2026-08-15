# Bot Protection Detection

## Overview

The bot detection utility (`src/utils/botDetection.ts`) identifies when websites are protected by WAFs (Web Application Firewalls) or bot protection services like Cloudflare. This allows the extension to gracefully handle blocked requests instead of displaying misleading challenge page content.

## Problem Solved

When a site like `producthunt.com` is protected by Cloudflare, the server returns:

- **Status**: 403 Forbidden
- **Title**: "Just a moment..."
- **Content**: A JavaScript challenge page, not the actual site

Without detection, the extension would display "Just a moment..." as the page title and show empty metadata—confusing users into thinking the site has no content.

## How It Works

### Detection Signals

The utility analyzes multiple signals to detect bot protection:

| Signal | Weight | Example |
| -------- | -------- | -------- |
| Server header | 0.3 | `server: cloudflare` |
| Status code | 0.2 | 403, 503 |
| Title pattern | 0.4 | "Just a moment...", "Access denied" |
| HTML patterns | 0.2 | `cf-browser-verification`, `__cf_chl_rt_tk` |

A confidence threshold of **0.4** is required for positive detection.

### Supported Providers

| Provider | ID | Detection Patterns |
| -------- | -------- | -------- |
| Cloudflare | `cloudflare` | Server header, challenge titles, HTML markers |
| Akamai | `akamai` | Server header, "Access denied" title |
| AWS WAF | `aws-waf` | Server header, captcha patterns |
| Sucuri | `sucuri` | Server header, firewall page |
| Imperva/Incapsula | `imperva` | Server header, "Request unsuccessful" |
| DDoS-Guard | `ddos-guard` | Server header |
| Generic | `generic` | Common block page titles |

## Usage

### Basic Detection

```typescript
import { detectBotProtection } from "../utils/botDetection";

const result = detectBotProtection({
  statusCode: 403,
  headers: { server: "cloudflare" },
  title: "Just a moment...",
  html: "<html>...</html>",
});

if (result.detected) {
  console.log(`Blocked by ${result.providerName}`); // "Blocked by Cloudflare"
  console.log(`Is challenge page: ${result.isChallengePage}`); // true
  console.log(`Confidence: ${result.confidence}`); // 0.9
}
```

### Getting User-Friendly Messages

```typescript
import { getDeniedAccessMessage } from "../utils/botDetection";

const message = getDeniedAccessMessage("cloudflare");
// Returns: "Access denied by Cloudflare"

const genericMessage = getDeniedAccessMessage();
// Returns: "Access denied"
```

### Checking Title Patterns

```typescript
import { isChallengePageTitle } from "../utils/botDetection";

isChallengePageTitle("Just a moment..."); // true
isChallengePageTitle("Product Hunt"); // false
```

## Integration with Digger

### Data Flow

1. **Fetch**: `useFetchSite.ts` fetches the HTML and headers
2. **Detect**: `detectBotProtection()` analyzes the response
3. **Filter**: If challenge page detected, fake title/metadata are excluded
4. **Store**: `botProtection` field added to `DiggerResult`
5. **Display**: Components show "Access denied" instead of fake content

### Type Definition

```typescript
interface BotProtectionData {
  detected: boolean;
  provider?: string; // e.g., "cloudflare"
  providerName?: string; // e.g., "Cloudflare"
  isChallengePage: boolean;
}
```

### Component Behavior

When `botProtection.isChallengePage` is `true`:

| Component | Behavior |
| -------- | -------- |
| Overview | Shows "Access denied by [Provider]" as subtitle |
| Metadata | Orange ⚠️ icons, "Access denied" text |
| Resources | Orange ⚠️ icons, "Access denied" text |
| DNS/Wayback | Unaffected (independent fetches) |

## Adding New Providers

To add detection for a new WAF:

```typescript
// In DETECTION_PATTERNS array
{
  id: "new-provider",
  name: "New Provider",
  serverHeaders: [/^new-provider/i],
  challengeTitles: [/^blocked by new provider/i],
  htmlPatterns: [/new-provider-token/i],
  blockingStatusCodes: [403],
}
```

### Pattern Guidelines

- **Server headers**: Case-insensitive regex matching the `Server` response header
- **Challenge titles**: Regex patterns for common block page titles
- **HTML patterns**: Unique strings in the challenge page HTML
- **Status codes**: HTTP codes that indicate blocking (typically 403, 429, 503)

## Logging

The utility logs detection events when verbose logging is enabled:

```text
[botDetection] detected { provider: "cloudflare", confidence: 0.9, isChallenge: true, statusCode: 403, title: "Just a moment..." }
```

## Limitations

- **JavaScript challenges**: Cannot bypass challenges, only detect them
- **Soft blocks**: May not detect rate limiting without explicit block pages
- **New providers**: Unknown WAFs fall back to generic detection
