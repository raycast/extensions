# Digger Extension - Implementation TODO

> **Digger**: Like `dig` but for the web. Comprehensive website intelligence and metadata extraction.

## Architecture Overview

- **UI Pattern**: Master-detail List ([System Monitor style](https://github.com/raycast/extensions/tree/c47012769cbeb0751c14784e2d5e006aed948c8e/extensions/system-monitor/src))
- **Categories on left**: Clickable sections showing summary
- **Detail panel on right**: Full metadata for selected category
- **Caching**: LocalStorage with 48-hour TTL, max 50 entries, LRU eviction
- **Timeout**: 5 seconds for all fetch operations
- **Fetch**: Native Node.js fetch (no external dependency)
- **Favicon**: Use `getFavicon` from `@raycast/utils`

---

## File Structure

```text
src/
├── digger.tsx                    # Main command (URL input → List view)
├── components/
│   ├── Overview.tsx              # Status, final URL, response time, favicon
│   ├── MetadataSemantics.tsx     # Title, description, OG, Twitter, JSON-LD
│   ├── Discoverability.tsx       # robots.txt, sitemap.xml, meta robots
│   ├── ResourcesAssets.tsx       # Icons, manifest, feeds (RSS/Atom)
│   ├── NetworkingSecurity.tsx    # HTTP headers, security headers
│   ├── DNSCertificates.tsx       # DNS records, TLS cert info
│   ├── PerformanceSignals.tsx    # Timing, resource hints
│   ├── WaybackMachine.tsx      # Wayback Machine snapshots
│   └── DataFeedsAPI.tsx          # Structured data, API hints
├── hooks/
│   ├── useFetchSite.ts           # Main fetch orchestrator
│   ├── useCache.ts               # LocalStorage cache management
│   └── use[Category].ts          # Individual category hooks as needed
├── utils/
│   ├── fetcher.ts                # Native fetch wrapper with timeout
│   ├── htmlParser.ts             # Cheerio parsing utilities
│   ├── urlUtils.ts               # URL normalization, validation
│   ├── dnsUtils.ts               # DNS lookup utilities
│   └── formatters.ts             # Display formatting helpers
├── actions/
│   └── Actions.tsx               # Shared action components
└── types/
    └── index.ts                  # TypeScript interfaces
```

---

## Phase 1: Foundation ✅

### 1.1 Type Definitions ✅

- [x] Create `src/types/index.ts`
- [x] Define `DiggerResult` interface (main data structure)
- [x] Define `CacheEntry` interface
- [x] Define category-specific interfaces:
  - `OverviewData`
  - `MetadataData`
  - `DiscoverabilityData`
  - `ResourcesData`
  - `NetworkingData`
  - `DNSData`
  - `PerformanceData`
  - `WaybackMachineData`
  - `DataFeedsData`

### 1.2 URL Utilities ✅

- [x] Create `src/utils/urlUtils.ts`
- [x] `normalizeUrl(url: string)`: Add protocol if missing, lowercase, remove trailing slash
- [x] `validateUrl(url: string)`: Check if valid URL format
- [x] `getDomain(url: string)`: Extract domain from URL
- [x] `getCacheKey(url: string)`: Generate consistent cache key

### 1.3 Fetcher with Timeout ✅

- [x] Create `src/utils/fetcher.ts`
- [x] `fetchWithTimeout(url: string, timeout?: number)`: Native fetch with AbortController
- [x] Default timeout: 5000ms
- [x] Return response metadata (status, headers, timing, final URL after redirects)

### 1.4 Cache Hook ✅

- [x] Create `src/hooks/useCache.ts`
- [x] `useCache()` hook returning:
  - `getFromCache(url: string)`: Get cached entry if valid (< 48 hours)
  - `saveToCache(url: string, data: DiggerResult)`: Save with timestamp
  - `clearCache()`: Remove all entries
  - `refreshEntry(url: string)`: Force invalidate single entry
- [x] Implement LRU eviction (max 50 entries)
- [x] Cache structure in LocalStorage:

  ```typescript
  interface CacheEntry {
    url: string;
    data: DiggerResult;
    timestamp: number;
    lastAccessed: number;
  }
  ```

### 1.5 Main Command Shell ✅

- [x] Create `src/digger.tsx`
- [x] URL input via `arguments` (like open-graph extension)
- [x] Auto-prepend `https://` if no protocol
- [x] Show loading state while fetching
- [x] Render `List` with `isShowingDetail={true}`
- [x] Placeholder sections for each category

---

## Phase 2: Core Fetching & Parsing ✅

### 2.1 HTML Parser Utilities ✅

- [x] Create `src/utils/htmlParser.ts`
- [x] Use Cheerio for parsing
- [x] Helper functions:
  - `getMetaContent(html, name)`: Get meta tag content by name
  - `getMetaProperty(html, property)`: Get meta tag content by property
  - `getLinkHref(html, rel)`: Get link tag href by rel
  - `getJsonLd(html)`: Extract and parse JSON-LD scripts
  - `getAllMeta(html)`: Get all meta tags as object

### 2.2 Main Fetch Orchestrator ✅

- [x] Create `src/hooks/useFetchSite.ts`
- [x] `useFetchSite(url: string)` hook:
  - Check cache first
  - Fetch HTML, robots.txt, sitemap.xml in parallel
  - Parse all data
  - Save to cache
  - Return `{ data, isLoading, error, refetch }`

### 2.3 Overview Component ✅

- [x] Create `src/components/Overview.tsx`
- [x] Display:
  - Icon (using Icon.Globe)
  - HTTP status code and status text
  - Final URL (after redirects)
  - Redirect chain (if any)
  - Response time (ms)
  - Content-Type
  - Content-Length
- [x] Use `List.Item` with `List.Item.Detail`

---

## Phase 3: Metadata Categories ✅

### 3.1 Metadata & Semantics ✅

- [x] Create `src/components/MetadataSemantics.tsx`
- [x] Extract and display:
  - HTML `<title>`
  - Meta description
  - Canonical URL
  - Open Graph tags (og:title, og:description, og:image, og:url, og:type, og:site_name)
  - Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image, twitter:site)
  - JSON-LD structured data (parsed and formatted)
- [x] Show status indicators (✓/✗) for presence
- [x] Add support for [Web Host Metadata](https://datatracker.ietf.org/doc/html/rfc6415)

### 3.2 Discoverability ✅

- [x] Create `src/components/Discoverability.tsx`
- [x] Display:
  - Meta robots directives (index/noindex, follow/nofollow)
  - Canonical URL
  - Sitemap detection
  - RSS/Atom feed URLs
  - Alternate links with hreflang

### 3.3 Resources & Assets ✅

- [x] Create `src/components/ResourcesAssets.tsx`
- [x] Extract and display:
  - Stylesheets (with media queries)
  - Scripts (with async/defer/type attributes)
  - Images (with alt text)
  - Special links (preconnect, DNS-prefetch, etc.)
  - RSS/Atom feed URLs
- [ ] Add visual grid of visual assets
  - Open Graph Image
  - Twitter Card Image
  - Favicon
  - Manifest Assets

---

## Phase 4: Actions ✅

### 4.1 Shared Actions Component ✅

- [x] Create `src/actions/Actions.tsx`
- [x] Common actions:
  - **Open in Browser**: Open URL in default browser
  - **Copy URL**: Copy the analyzed URL
  - **Refresh**: Force re-fetch and update cache
  - **Clear Cache**: Remove all cached entries

### 4.2 Copy Actions ✅

- [x] **Copy as JSON**: Full structured data export
- [x] **Copy as Markdown**: Formatted report
- [x] **Copy Individual Values**: Context-aware per category
  - Copy Title
  - Copy Description
  - Copy OG Image URL
  - Copy Favicon URL
  - etc.

### 4.3 External Actions ✅

- [x] **Open in Wayback Machine**: Link to archive.org
- [x] **View Page Source**: Open view-source: URL
- [x] **Check on Google**: Search for site:domain

---

## Phase 5: Network & DNS ✅

### 5.1 Networking & Security

- [x] Create `src/components/NetworkingSecurity.tsx`
- [x] Display HTTP headers:
  - Server
  - X-Powered-By
  - Cache-Control
  - ETag
  - Last-Modified
- [x] Security headers analysis:
  - Content-Security-Policy (CSP)
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Referrer-Policy
  - Permissions-Policy
- [x] Show status indicators (✓ present, ✗ missing)

### 5.2 DNS & Certificates

- [x] Create `src/utils/dnsUtils.ts`
- [x] Create `src/components/DNSCertificates.tsx`
- [x] DNS lookups (using Node.js `dns` module):
  - A records (IPv4)
  - AAAA records (IPv6)
  - CNAME records
  - MX records
  - TXT records
  - NS records
- [x] TLS certificate info (using `tls` module):
  - Issuer
  - Subject
  - Valid from/to
  - Days until expiry
  - Certificate chain

---

## Phase 6: Advanced Features

### 6.1 History & Evolution

- [x] Create `src/components/WaybackMachine.tsx`
- [x] Wayback Machine API integration:
  - First capture date
  - Last capture date
  - Total snapshots count
  - Link to browse history
- [x] Show timeline if available

### 6.2 Data Feeds & API

- [x] Create `src/components/DataFeedsAPI.tsx`
- [x] Extract and display:
  - RSS/Atom feed previews (title, item count)
  - JSON-LD data formatted
  - API discovery hints (link rel="api")
  - OpenAPI/Swagger references
  - GraphQL endpoint hints

---

## Phase 8: Enhanced Resources & Images

### 8.1 View All Resources Action ✅

- [x] Create `src/components/ResourcesListView.tsx` - List view with dropdown filter
- [x] Add "View All Stylesheets/Scripts/Feeds" action when >5 resources detected
- [x] Dropdown to filter by: Stylesheets, Scripts, Feeds
- [x] Section headers for each resource type
- [x] Filename displayed on the left
- [x] Open URL action on each row to view linked asset in browser

### 8.2 Comprehensive Image Detection ✅

Expand image sources to include:

**HTML Link/Meta Tags:**

- [x] `<link rel="icon">`, `<link rel="shortcut icon">`, `<link rel="icon" sizes="...">`
- [x] `<link rel="apple-touch-icon">`, `<link rel="apple-touch-icon-precomposed">`
- [x] `<link rel="mask-icon">` (Safari pinned tabs)
- [x] `<meta name="msapplication-TileImage">`
- [x] `<meta property="og:image">`, `<meta property="og:image:url">`
- [x] `<meta name="twitter:image">`, `<meta name="twitter:image:src">`, `<meta name="twitter:player:image">`

**JSON-LD Structured Data:**

- [x] `Organization.logo`, `Article.image`, `Product.image`, `Person.image`, `WebSite.image`

**Manifest.json:**

- [ ] Parse `/manifest.json` for icons array (future enhancement)

**Convention-based URLs (probe):**

- [ ] `/favicon.ico`, `/apple-touch-icon.png`, etc. (future enhancement - requires additional HTTP requests)

### 8.3 Images Grid View ✅

- [x] Create `src/components/ImagesGridView.tsx` using Raycast Grid component
- [x] "View All Images" action when >0 images detected
- [x] Display image thumbnails with source type labels
- [x] Deduplicate images by URL (show unique count, not total)

### 8.4 Theme Color Support ✅

- [x] Extract `<meta name="theme-color">`
- [x] Display with color swatch in ResourcesAssets detail panel

### 8.5 Type Updates ✅

- [x] Add `ImageAsset` interface with `src`, `alt`, `type` (favicon, og, twitter, manifest, etc.), `sizes`
- [x] Add `themeColor` to `ResourcesData`
- [x] Update `ResourcesData.images` to use new `ImageAsset` type

### 8.6 Fonts Collection

Detect and display web fonts used by the page.

**Font Sources to Detect:**

- [x] **Google Fonts** - `<link>` tags pointing to `fonts.googleapis.com` or `fonts.gstatic.com`
- [x] **Adobe Fonts (Typekit)** - `<link>` or `<script>` tags referencing `use.typekit.net` or `typekit.com`
- [x] **Font Awesome** - `<link>` tags pointing to Font Awesome CDNs
- [x] **Custom Fonts** - `<link rel="preload" as="font">` tags
- [x] **Preconnect hints** - `<link rel="preconnect">` to font providers

**Implementation Tasks:**

- [x] Add `FontAsset` interface to `src/types/index.ts`:
  - `family`: Font family name (e.g., "Roboto", "Open Sans")
  - `provider`: Provider name (e.g., "Google Fonts", "Adobe Fonts", "Custom", "Font Awesome")
  - `url`: Source URL
  - `variants?`: Font variants/weights if detectable (e.g., "400", "700")
  - `format?`: Font format if specified (e.g., "woff2", "ttf")
- [x] Add `fonts?: FontAsset[]` to `ResourcesData` interface
- [x] Create `src/utils/fontUtils.ts` with helper functions:
  - `extractGoogleFonts(url)`: Parse Google Fonts URL to extract family names
  - `detectFontProvider(url)`: Identify provider from URL patterns
  - `parseFontFamily(url)`: Extract font family name from various URL formats
- [x] Add font detection logic in `src/hooks/useFetchSite.ts` with logging
- [x] Add fonts section to `src/components/ResourcesAssets.tsx`:
  - Display font count with check/x icon
  - Show first 5 fonts with provider labels
  - Show "...and X more" if >5 fonts
- [x] Add fonts to `src/components/ResourcesListView.tsx`:
  - Add `"fonts"` to `ResourceType` union
  - Add `"font"` to `ResourceItem` type
  - Add fonts dealing in `buildResourceItems`
  - Add fonts filter to dropdown (use `Icon.Text`)
  - Update `sectionOrder` array

**Display Format:**

In ResourcesAssets detail panel:

```text
Fonts (3)
✓ Google Fonts | Roboto (400, 700)
  Google Fonts | Open Sans (300, 400)
  Adobe Fonts | proxima-nova
```

In ResourcesListView:

```text
Section: Fonts (3)
- Roboto
  Subtitle: Google Fonts • 400, 700
  Accessory: fonts.googleapis.com/...
```

**Edge Cases:**

- Multiple font families from same provider
- Font URLs without clear family names
- Preconnect hints without actual font links
- Duplicate fonts from different sources
- Font Awesome icon fonts vs. text fonts

---

## Phase 7: Polish

### 7.1 Error Handling

- [ ] Graceful handling of:
  - Network timeouts
  - Invalid URLs
  - 4xx/5xx responses
  - Parse errors
  - DNS failures
- [ ] Show appropriate error messages with retry options

### 7.2 Loading States

- [ ] Skeleton loading for each category
- [ ] Progressive loading (show data as it arrives)
- [ ] Loading indicators in accessories

### 7.3 Visual Polish

- [ ] Consistent icons for each category
- [ ] Color-coded status tags
- [ ] Proper separators in metadata
- [ ] Keyboard shortcuts for common actions
- [ ] Don't instantly pop-to-root when actioning; persist last view in Raycast UI

---

## Data Categories Summary

| Category              | Icon | Key Data                                 |
| --------------------- | ---- | ---------------------------------------- |
| Overview              | 🌐   | Status, URL, timing, favicon             |
| Metadata & Semantics  | 📝   | Title, description, OG, Twitter, JSON-LD |
| Discoverability       | 🔍   | robots.txt, sitemap.xml, meta robots     |
| Resources & Assets    | 📦   | Icons, manifest, feeds                   |
| Networking & Security | 🔒   | HTTP headers, security headers           |
| DNS & Certificates    | 🌍   | DNS records, TLS cert                    |
| Performance & Signals | ⚡   | Timing, resource hints                   |
| History & Evolution   | 📜   | Wayback Machine data                     |
| Data Feeds & API      | 📡   | RSS, JSON-LD, API hints                  |

---

## Future Improvements

### Full Page Parsing Option

- [ ] Add preference "Analyze full page" (default: off) to parse entire HTML document instead of just `<head>`
- [ ] Would enable extraction of `<img>` tags from `<body>`
- [ ] Trade-off: More data vs. slower fetches and higher bandwidth usage and possible memory issues
- [ ] JS-heavy sites (e.g., Amazon) would still be limited since they load content dynamically

### Manifest.json Parsing

- [x] Fetch and parse manifest.json (via `<link rel="manifest">`)
- [x] Extract `icons` array as `manifest-icon` type
- [x] Extract `screenshots` array as `manifest-screenshot` type (with `label` as alt text)
- [x] Extract `shortcuts` icons as `manifest-shortcut` type
- [ ] Extract `theme_color`, `background_color`, `name`, `short_name` for display in Overview

### Convention-based URL Probing

- [ ] Probe common favicon/icon URLs: `/favicon.ico`, `/apple-touch-icon.png`, etc.
- [ ] Trade-off: Additional HTTP requests per site

---

## Dependencies

Already in `package.json`:

- `@raycast/api` - Core Raycast API
- `@raycast/utils` - Utilities including `getFavicon`
- `cheerio` - HTML parsing

No additional dependencies needed (using native `fetch`, `dns`, `tls`).

---

## Reference Extensions

- [System Monitor](https://github.com/raycast/extensions/tree/main/extensions/system-monitor) - UI pattern
- [Open Graph](https://github.com/raycast/extensions/tree/main/extensions/open-graph) - OG parsing
- [Web Audit](https://github.com/raycast/extensions/tree/main/extensions/web-audit) - SEO checks

---

## Notes

- Cache key is normalized URL (lowercase, no trailing slash, with protocol)
- All fetches use 5-second timeout
- Parallel fetching where possible (HTML + robots.txt + sitemap.xml)
- Progressive enhancement: show what we have, indicate what's loading/failed
