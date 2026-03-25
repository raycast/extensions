# Technical Architecture: Find in Chrome - Unified Raycast Extension

---

## About this doc
This document explains the technical architecture based on the overall solution concept and requirements explained in: PRD.md


## 1. Technical Architecture

### 1.1 Stack

| Component | Technology |
|-----------|-----------|
| Extension framework | Raycast API (TypeScript + React) |
| UI | Raycast `List` component with sections |
| Tab access | AppleScript via `@raycast/utils` (`runAppleScript`) |
| Bookmark parsing | Native `fs` + JSON parsing |
| History queries | macOS built-in `sqlite3` CLI (no native modules) |
| Favicon delivery | Google Favicon Service (remote URL) |

### 1.2 Data Sources

The extension aggregates results from three Chrome data sources, loaded in parallel on launch:

| Source | Method | Data Location |
|--------|--------|---------------|
| **Open Tabs** | AppleScript (`tell application "Google Chrome"`) | Chrome runtime via Apple Events |
| **Bookmarks** | JSON file parsing | `<profile>/Bookmarks` |
| **History** | SQLite query via `sqlite3` CLI | `<profile>/History` (copied to temp file to avoid Chrome's write lock) |

### 1.3 Profile Detection Strategy

The extension reads Chrome's `Local State` JSON file to detect the active profile:

1. **Primary:** Read `profile.last_active_profiles[0]` from `Local State`
2. **Fallback:** Scan `profile.info_cache` for the profile with the most recent `active_time`
3. **Ultimate fallback:** Use the `Default` profile

### 1.4 Favicon Strategy

Favicons are fetched via Google's public favicon service:

```
https://www.google.com/s2/favicons?sz=64&domain={hostname}
```

Loaded as remote images by Raycast and cached at the OS level. If the favicon request fails, Raycast renders the fallback icon specified in the code (source-type icon).

### 1.5 Data Flow

```
Extension Launch
    │
    ├── [async] getChromeTabs()        → AppleScript → Chrome runtime
    ├── [async] getChromeBookmarks()   → fs.readFile → <profile>/Bookmarks (JSON)
    └── [async] getChromeHistory()     → cp History → sqlite3 query → temp DB
             │
             ▼
        Combine & Deduplicate (tab > bookmark > history)
             │
             ▼
        Render List with Sections
             │
             ▼
        Raycast Native Fuzzy Search (real-time filtering)
```

### 1.6 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Use `sqlite3` CLI instead of `better-sqlite3` npm package | Avoids native compilation (node-gyp), which fails on many setups due to Python/Xcode version mismatches. `sqlite3` is pre-installed on every Mac. |
| Copy History DB to temp file before querying | Chrome holds a write lock on the History database while running. Copying avoids `SQLITE_BUSY` errors. |
| Google Favicon Service over Chrome's local favicon DB | Chrome's `Favicons` DB uses a complex schema. Google's service is simpler, universally available, and OS-cached. |
| Custom filtering with `filtering={false}` | Required for word-order-independent matching and content search - features not supported by Raycast's native filtering. |
| Read `Local State` for profile detection | More reliable than AppleScript - works even if Chrome has no open windows. |

### 1.7 Empty State

A custom `List.EmptyView` is rendered inside the `List` component. It is shown by Raycast automatically when all sections contain no items and `isLoading` is false — for example when Chrome is not running and there are no bookmarks or history entries, or briefly during the initial data fetch before the loading state is set. Providing a custom empty view prevents the default Raycast "No results" flicker.

The empty view displays:
- **Icon**: `Icon.Globe`
- **Title**: "No Results Found"
- **Description**: "Try a different search, or check that Chrome is running."

### 1.8 Search Strategy

The extension uses custom filtering to support word-order-independent search:

1. **Query tokenization**: Split search query into lowercase words
2. **Token matching**: Check if ALL tokens appear in target text (title, URL, domain, or content)
3. **Order independence**: "request github" matches "GitHub Pull Request" because both tokens exist

```typescript
// Example: "request github" → ["request", "github"]
// Matches: "GitHub Pull Request #123" (contains both "github" and "request")
```

This approach enables more flexible searching while maintaining result relevance.

### 1.9 Content Search

For open tabs, the extension fetches page content via JavaScript execution through AppleScript:

```
Tab Metadata Loaded (Phase 1, ~350ms)
         │
         ▼
    Display Results (immediate)
         │
         ▼
Content Fetch (Phase 2, background)
         │
    AppleScript → Chrome → execute JavaScript
         │
         ▼
    document.body.innerText (truncated to 10KB)
         │
         ▼
    Merge content into results
         │
         ▼
    Content search now available
```

**Limitations:**
- **Open tabs**: Full content search via JavaScript execution ✅
- **Bookmarks**: Title/URL only (no cached content access) ⚠️
- **History**: Title/URL only (cache format too complex) ⚠️

When content matches a search query, the result displays:
- A "Content Match" tag alongside the source tag
- A content snippet showing the matching text with context

---

## 2. Platform Compatibility

| Platform | Supported | Notes |
|----------|-----------|-------|
| macOS 12+ | ✅ Yes | Full support - primary target |
| macOS 11 and earlier | ❌ No | Raycast requires macOS 12+ |
| Windows | ❌ No | Raycast is macOS-only; AppleScript is macOS-only |
| Linux | ❌ No | Raycast is macOS-only |

---

## 3. Installation & Distribution

### 3.1 Local Installation

```bash
unzip chrome-find-extension.zip -d ~/Developer/
cd ~/Developer/chrome-find-extension
npm install
npm run dev
```

One-time setup. Extension persists in Raycast across restarts.

### 3.2 Prerequisites

- macOS 12+
- Node.js v18+
- Google Chrome
- Raycast

### 3.3 Required macOS Permissions

| Permission | Path | Purpose |
|-----------|------|---------|
| Automation | System Settings → Privacy → Automation → Raycast → Google Chrome | AppleScript tab control |
| Accessibility | System Settings → Privacy → Accessibility → Raycast | Window/tab switching |
| JavaScript from Apple Events | Chrome → View → Developer → Allow JavaScript from Apple Events | AppleScript communication |

### 3.4 Future: Raycast Store

The extension can be published to the Raycast Store for one-click installation. This would require preparing metadata, screenshots, and passing Raycast's review process.

---

## 4. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Chrome changes AppleScript API | Low | High | Pin to known-working AppleScript commands; tab-index approach is stable |
| Google Favicon Service becomes unavailable | Very Low | Low | Fallback icons already implemented; could switch to DuckDuckGo's favicon service |
| Large history DB causes slow load | Medium | Medium | Capped at 500 entries; could add pagination via Raycast's built-in pagination API |
| Chrome profile structure changes | Low | Medium | `Local State` format has been stable for years; fallback to `Default` profile |
| macOS permission dialogs confuse users | Medium | Low | README documents all required permissions with step-by-step instructions |

---


## 4. Appendix: Explored Alternatives

During the design process, several alternative approaches were evaluated:

| Approach | Verdict | Reason |
|----------|---------|--------|
| Raycast Fallback Commands | Rejected | Still requires manual choice between tabs/bookmarks; no unified list |
| Bash Script Command | Rejected | Cannot render interactive, filterable lists - only returns a single result |
| Chrome as PWA (installed app) | Partial solution | Solves the "switch to existing window" problem for single sites, but doesn't help with searching across tabs/bookmarks/history |
| Arc Browser | Rejected | Requires switching browsers entirely; not viable for Chrome-dependent users |
| `better-sqlite3` npm package | Rejected | Requires native compilation via node-gyp, which frequently fails due to Python/Xcode version mismatches |


