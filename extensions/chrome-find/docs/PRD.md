# PRD: Find in Chrome - Unified Raycast Extension

---

## About this doc

This doc explains:
* the problem that the Raycast extension solves
* solution concept, including all the detailed requirements (both functional and non-functional)

---

## 1. Problem Statement

When working in Google Chrome with many open tabs, bookmarks, and a rich browsing history, switching to a specific page is slow and fragmented. The current workflow requires multiple steps and separate tools:

1. **Opening a page via Raycast or Spotlight** always opens a *new tab*, even if the page is already open - leading to duplicate tabs and lost context.
2. **Searching open tabs** requires launching one Raycast command ("Search Tabs"), and if the tab isn't open, the user must exit, launch a *different* command ("Search Bookmarks" or "Search History"), and retype the query.
3. **No unified view** exists that lets a user type a query once and see matching results across tabs, bookmarks, and history in a single, filterable list.

This fragmented workflow costs time, creates cognitive overhead, and results in tab clutter - especially for power users who juggle dozens of tabs across multiple projects.

---

## 2. Goal

Build a **single Raycast extension** that provides a unified, real-time searchable list across Chrome tabs, bookmarks, and browsing history. The extension should:

- Require zero configuration out of the box
- Automatically detect the active Chrome profile
- Prioritize switching to an existing tab over opening a duplicate
- Display site favicons for quick visual recognition
- Work reliably on any Mac running macOS 12+ with Google Chrome

---

## 3. Target Users

- macOS power users who rely on Raycast as their primary launcher
- Users with heavy Chrome usage (10+ tabs, extensive bookmarks, rich history)
- Users who manage multiple Chrome profiles (work, personal)
- Productivity-focused professionals who want keyboard-driven workflows

---

## 4. User Stories & Acceptance Criteria

### US-1: Unified Search Across All Chrome Sources

**As a** Raycast user,
**I want to** type a query once and see all matching open tabs, bookmarks, and history entries in a single filterable list,
**so that** I don't have to search three different commands separately or retype my query.

**Acceptance Criteria:**

- AC-1.1: When the user opens the "Find in Chrome" command, results from open tabs, bookmarks, and browsing history are displayed in a single list.
- AC-1.2: Results are organized into three labeled sections: "Open Tabs", "Bookmarks", and "History".
- AC-1.3: As the user types, results are filtered in real-time using fuzzy matching against the page title, full URL, and domain name.
- AC-1.4: When the same URL appears in multiple sources (e.g., open tab and bookmark), only the highest-priority version is shown: tab > bookmark > history.
- AC-1.5: URL comparison for deduplication is normalized (trailing slashes and URL fragments are ignored).
- AC-1.6: Each section displays a count of matching items in its header (e.g., "Open Tabs - 12 tabs").

---

### US-2: Switch to an Existing Open Tab

**As a** Chrome user with many open tabs,
**I want to** select an already-open page from the search results and switch directly to that tab,
**so that** I avoid opening duplicate tabs and return to my existing context.

**Acceptance Criteria:**

- AC-2.1: When the user presses Enter on a result tagged as "Tab", the Chrome window containing that tab is brought to the foreground.
- AC-2.2: The selected tab becomes the active tab in its window.
- AC-2.3: No new tab is opened when switching to an existing one.
- AC-2.4: A confirmation toast is shown: "Switched to: {page title}".
- AC-2.5: Raycast is dismissed (closed) immediately after switching to the tab.

---

### US-3: Open a Page from Bookmarks or History

**As a** Chrome user,
**I want to** select a bookmark or history entry from the search results and have it open in Chrome,
**so that** I can quickly return to previously visited pages without navigating Chrome's own menus.

**Acceptance Criteria:**

- AC-3.1: When the user presses Enter on a result tagged as "Bookmark" or "History", the URL opens in a new Chrome tab.
- AC-3.2: Chrome is brought to the foreground after opening the URL.
- AC-3.3: A confirmation toast is shown: "Opening: {page title}".
- AC-3.6: Raycast is dismissed (closed) immediately after opening the URL in Chrome.
- AC-3.4: The user can alternatively open the URL in their default browser via a secondary action.
- AC-3.5: The user can copy the URL to the clipboard via ⌘ + C.

---

### US-4: Automatic Chrome Profile Detection

**As a** user with multiple Chrome profiles (e.g., work and personal),
**I want** the extension to automatically use bookmarks and history from whichever profile is currently active,
**so that** I don't need to configure profile paths manually or reconfigure when I switch profiles.

**Acceptance Criteria:**

- AC-4.1: On launch, the extension detects the currently active Chrome profile without any user configuration.
- AC-4.2: Bookmarks and history results correspond to the detected active profile.
- AC-4.3: If the user switches Chrome profiles and re-launches the extension, the new profile's data is used.
- AC-4.4: If the active profile cannot be determined, the extension falls back to the Default profile and still functions normally.
- AC-4.5: Tab results are always shown regardless of profile, as tabs are retrieved across all open Chrome windows.

---

### US-5: Visual Page Identification via Favicons

**As a** user scanning a long list of results,
**I want to** see the website's favicon next to each result,
**so that** I can quickly identify pages visually without reading every title.

**Acceptance Criteria:**

- AC-5.1: Each result displays the website's favicon as the list item icon.
- AC-5.2: Favicons are displayed for all result types: tabs, bookmarks, and history entries.
- AC-5.3: If a favicon cannot be loaded, a fallback icon is shown based on the source type (Globe for tabs, Bookmark icon for bookmarks, Clock for history).
- AC-5.4: Favicon loading does not block or delay the rendering of the results list.

---

### US-6: Source Type Identification

**As a** user,
**I want to** see a clear visual indicator of whether each result is an open tab, a bookmark, or a history entry,
**so that** I know what action will be taken when I select it (switching to a tab vs. opening a new one).

**Acceptance Criteria:**

- AC-6.1: Each result displays a colored tag on the right side indicating its source.
- AC-6.2: The tag colors are distinct and consistent: green for "Tab", blue for "Bookmark", orange for "History".
- AC-6.3: The tag label text reads "Tab", "Bookmark", or "History" respectively.
- AC-6.4: Each result also displays the domain name as a subtitle beneath the page title.

---

### US-7: Always Up-to-Date Results

**As a** user,
**I want** the extension to always show the current list of open tabs, bookmarks, and recently visited pages,
**so that** I don't have to worry about stale data, manually refreshing, or restarting the extension to pick up changes.

**Acceptance Criteria:**

- AC-7.1: Every time the user opens the "Find in Chrome" command, data is freshly loaded from all three sources (tabs, bookmarks, history).
- AC-7.2: The user can manually trigger a data refresh within the extension via ⌘ + R without closing and reopening it.
- AC-7.3: A loading indicator is shown while data is being fetched.
- AC-7.4: If Chrome is not running when the extension is opened, bookmarks and history are still displayed (only the tabs section is empty).

---

### US-8: Word-Order-Independent Search

**As a** user searching for a page,
**I want** the search to find pages regardless of the order in which I type the words,
**so that** I can find pages even when I don't remember the exact order of words in the title.

**Acceptance Criteria:**

- AC-8.1: When the user types multiple words, the search matches pages containing all words in any order.
- AC-8.2: Searching "request github" matches a page titled "GitHub Pull Request #123".
- AC-8.3: Searching "docs api raycast" matches "Raycast API Docs" and "API Documentation for Raycast".
- AC-8.4: Each word in the query must appear somewhere in the page title, URL, or domain (all words required, any order).
- AC-8.5: Search remains case-insensitive.
- AC-8.6: Search performance remains responsive with no perceptible lag.

---

### US-9: Content-Based Search for Cached Pages

**As a** user searching for a page,
**I want** the extension to search within the cached content of pages (not just titles and URLs),
**so that** I can find pages based on their content when I don't remember the exact title.

**Acceptance Criteria:**

- AC-9.1: For pages that Chrome has cached, the extension searches within the page's text content.
- AC-9.2: If a search term appears in the cached page content but not in the title or URL, the page is still returned as a result.
- AC-9.3: Content-matched results are clearly indicated (e.g., showing a snippet of the matching content).
- AC-9.4: Content search applies to open tabs, bookmarks, and history entries where cached content is available.
- AC-9.5: If cached content is not available for a page, the extension falls back to title/URL matching without error.
- AC-9.6: Content indexing does not significantly impact extension launch time (< 2 seconds total load time).

---

## 5. Non-Functional Requirements

### 5.1 Performance & Technical Requirements

| Requirement | Target |
|-------------|--------|
| **Launch time** | Results list fully populated in under 1 second from command launch |
| **Search responsiveness** | Real-time filtering with no perceptible lag |
| **History depth** | 500 most recent entries (configurable in code) |
| **Zero configuration** | Works out of the box with no user settings required |
| **No native compilation** | No dependencies requiring `node-gyp` or native builds |
| **Persistence** | Extension remains registered in Raycast after initial setup - survives restarts |
| **Platform** | macOS 12 (Monterey) and later |
| **Test coverage** | Minimum 90% unit test coverage for all utility code |
| **Security** | Zero npm dependencies with high-severity vulnerabilities (`npm audit` must report no high/critical issues) |

### 5.2 Raycast Store Publication Requirements

The extension must meet all Raycast Store guidelines for publication.

**Acceptance Criteria:**

#### Metadata & Configuration
- AC-NFR-1: The `author` field in package.json must match the developer's Raycast account username.
- AC-NFR-2: The `license` field must be set to "MIT".
- AC-NFR-3: The extension must use a recent version of the Raycast API.
- AC-NFR-4: A `package-lock.json` file must be present and generated via npm.
- AC-NFR-5: `npm run build` must complete without errors.
- AC-NFR-6: `npm run lint` must complete without errors.

#### Naming Conventions
- AC-NFR-7: Extension title must follow Apple Style Guide (Title Case) and clearly convey purpose.
- AC-NFR-8: Command titles must follow the `<verb> <noun>` or `<noun>` structure.
- AC-NFR-9: All text must be in US English (no British spellings).

#### Visual Assets
- AC-NFR-10: Extension icon must be 512x512px PNG format.
- AC-NFR-11: Icon must display properly in both light and dark themes.
- AC-NFR-12: Icon must not be the default Raycast icon.
- AC-NFR-13: Screenshots must be provided (minimum 1, maximum 6).
- AC-NFR-14: Screenshots must be 2000x1250px PNG format (16:10 landscape).
- AC-NFR-15: Screenshots must use consistent backgrounds and show informative commands.

#### Documentation
- AC-NFR-16: A user-facing README.md must be provided with setup instructions and usage guide.
- AC-NFR-17: A CHANGELOG.md must be present with version history.
- AC-NFR-18: Media files (screenshots) must be stored in a top-level `media/` folder.

#### Code Quality
- AC-NFR-19: No external analytics integrations are permitted.
- AC-NFR-20: No Keychain Access requests are permitted.
- AC-NFR-21: Action panel items must follow Title Case naming with consistent icons.
- AC-NFR-22: Empty states must be customized (no flickering empty state).
- AC-NFR-23: Search bars must include placeholder text.

---

### US-10: Search in Google

**As a** user searching through tabs, bookmarks, and history,
**I want to** trigger a Google search directly from the extension using my current search query,
**so that** I can quickly find information online without switching apps or retyping my query.

**Acceptance Criteria:**

- AC-10.1: When the user has typed a search query, a "Search in Google" item is visible in a dedicated "Web Search" section at the bottom of the results list — including when all other sections are empty.
- AC-10.2: Selecting "Search in Google" opens a new Chrome tab with a Google search pre-populated with the current search query, so the user sees results immediately.
- AC-10.3: Chrome is brought to the foreground and Raycast is dismissed after triggering the search.
- AC-10.4: When the search query is cleared, the "Web Search" section is hidden.

---

## 6. Future Enhancements

| Enhancement | Priority | Complexity |
|-------------|----------|-----------|
| Multi-profile support (search across all profiles simultaneously) | Medium | Medium |
| Configurable history limit via Raycast preferences | Low | Low |
| Keyboard shortcut to open extension directly (bypassing Raycast search) | Low | Low |
| Support for Chrome-based browsers (Brave, Edge, Arc) | Medium | High |
| Close tab action (from within the extension) | Low | Low |
| Recently closed tabs section | Medium | Medium |

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| Steps to find and switch to a page | ≤ 2 (open Raycast + select result) vs. current 5-11 steps |
| Time to first result | < 1 second from command launch |
| Duplicate tabs created per day | Reduced significantly vs. baseline |
| User configuration required | Zero (fully automatic) |
| Raycast Store publication | Approved and published |
