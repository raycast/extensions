# duan (Raycast Extension)

URL shortener service based on Cloudflare Workers and D1 database.

<p align="center">
  <img src="https://img.shields.io/badge/cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/D1%20Database-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare D1">
  <img src="https://img.shields.io/badge/Raycast-Extension-blue.svg?style=for-the-badge&logo=raycast&logoColor=white" alt="Raycast Extension">
</p>

## Features

- Create and manage short links
- Enable/disable links
- Add descriptions to links
- Advanced search capabilities
  - Search across multiple fields (short code, URL, description)
  - Support partial matching
  - Case-insensitive search
  - Unicode character support
- Pin important links
  - Pinned links stay at the top
  - Reorder pinned links with keyboard shortcuts
  - Pinned links are excluded from filtering and sorting
- Flexible sorting options
  - Sort by creation time (newest/oldest first)
  - Sort by last visited time
  - Sort by visit count
  - Sorting preferences are remembered
- Quick filtering
  - Filter all links
  - Show only active links
  - Show only disabled links
  - Filter selection persists across sessions

## How to use?

1. [Deploy your own duan API service](https://github.com/insv23/duan/tree/main?tab=readme-ov-file#installation) on Cloudflare Workers.

2. Install the Raycast extension from the Raycast Extension Store.

   Or manual installation:
   ```bash
   git clone https://github.com/insv23/duan-raycast-extension.git && cd duan-raycast-extension
   npm install && npm run dev
   ```

3. Configure the extension with your API host and token.

4. Start using the extension to shorten and manage your links.

## Development

### Project Structure

```
.
├── README.md
├── package.json
├── src/
│   ├── components/
│   │   ├── LinkDetail.tsx    # Link edit form
│   │   └── LinkItem.tsx      # List item component
│   ├── hooks/
│   │   └── useLinks.ts       # Data fetching hook
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts     # API client implementation
│   │   │   ├── config.ts     # API configuration
│   │   │   ├── endpoints/
│   │   │   │   ├── links.ts  # Links API endpoints
│   │   │   │   └── slugs.ts  # Slugs API endpoints
│   │   │   └── index.ts      # API exports
│   │   ├── filter.ts         # Link filtering logic
│   │   ├── pin.ts           # Pin management
│   │   ├── search.ts         # Search utilities
│   │   ├── sort.ts          # Sorting logic
│   │   └── validation/
│   │       ├── slug/
│   │       │   ├── cache.ts  # Slug cache management
│   │       │   ├── index.ts  # Slug validation logic
│   │       │   └── types.ts  # Slug validation types
│   │       ├── url/
│   │       │   ├── index.ts  # URL validation logic
│   │       │   └── types.ts  # URL validation types
│   │       └── index.ts      # Validation exports
│   ├── types/
│   │   └── index.ts          # TypeScript definitions
│   ├── utils/
│   │   └── random.ts         # Random slug generation
│   ├── list-links.tsx        # List links command
│   └── shorten-link.tsx      # Create link command
```

### Search Functionality

The extension provides a powerful search feature that allows users to find links by:
- Short code
- Original URL
- Description

Search implementation supports:
- Partial matching (e.g., searching "git" will match "github.com")
- Case-insensitive search
- Unicode text search
- Multiple field search (matches any of the fields)

Example:
```typescript
// Search across all fields
const results = searchLinks(links, "github");

// Will match:
// - Short code: "gh-repo"
// - URL: "https://github.com/..."
// - Description: "My GitHub repository"
```

### Keyboard Shortcuts

#### General Actions
- `⌘ Enter` - Copy short link to clipboard
- `⌘ E` - Edit link details
- `⌘ ⌫` - Delete link

#### Pin Management
- `⌘ ⇧ P` - Pin/Unpin link
- `⌘ ⇧ ↑` - Move pinned link up (only for pinned links)
- `⌘ ⇧ ↓` - Move pinned link down (only for pinned links)

#### Sorting
- `⌘ ⇧ C` - Sort by creation time
- `⌘ ⇧ L` - Sort by last visited time
- `⌘ ⇧ N` - Sort by visit count

#### Filtering
- `⌘ P` - Open filter dropdown

### Link Organization

The extension provides powerful organization features:

1. **Pinning System**
   - Pin important links to keep them always at the top
   - Pinned links maintain their order across sessions
   - Reorder pinned links with keyboard shortcuts
   - Pinned links are excluded from sorting and filtering

2. **Smart Sorting**
   - Multiple sorting options available through the Actions menu
   - Your sorting preference is saved automatically
   - Sorting only applies to unpinned links

3. **Quick Filtering**
   - Use the dropdown (⌘ P) to quickly filter links
   - Filter options: All, Active only, or Disabled only
   - Filter selection persists between sessions

4. **Data Processing Pipeline**
   ```
   Original Links → Filter → Sort → Search → Display
   ```
   - Pinned links bypass filtering and sorting
   - Search applies to all links (including pinned)

### Caching Mechanisms

Raycast provides three different caching mechanisms, each suited for specific use cases:

#### Cache (Low-level API)
- **Characteristics:**
  - Basic key-value storage
  - Synchronous operations
  - Full cache management control
  - Usable outside React environment
- **Best for:**
  - Cache usage in non-React code
  - Precise control over cache read/write operations
  - Custom cache strategy implementation
  - Form validation caching

#### useCachedState (React Hook)
- **Characteristics:**
  - Similar to useState but persisted
  - Suitable for UI state storage
  - Shareable between components
- **Best for:**
  - Persisting UI state across app restarts
  - Sharing persistent state between components
  - Storing user preferences
  - UI configuration persistence

#### useCachedPromise (React Hook)
- **Characteristics:**
  - Implements stale-while-revalidate strategy
  - Automatic loading state handling
  - Built-in error handling
  - Optimized for async data fetching
- **Best for:**
  - Caching API call results
  - Background data refresh implementation
  - Optimizing data loading experience
  - List data caching

#### Implementation Examples

To demonstrate how to choose the appropriate caching mechanism, here are two concrete examples from our project:

##### Links List Caching
- **Use Case:** Caching the list of all shortened links
- **Chosen Solution:** `useCachedPromise`
- **Rationale:**
  - Involves async API calls to fetch data
  - Requires automatic background refresh
  - Needs loading state management
  - Benefits from stale-while-revalidate strategy
  - Data should stay fresh while allowing immediate display of cached content

##### Slug Availability Validation
- **Use Case:** Caching results of slug availability checks
- **Chosen Solution:** `Cache` (low-level API)
- **Implementation Details:**
  1. When the "Shorten Link" command loads:
     - Fetch all used slugs via API
     - Store them in Cache synchronously
     - Use requestIdleCallback to avoid blocking UI
     - Include timeout and cleanup mechanisms
  2. During form validation:
     - Synchronously read from Cache
     - Perform format validation
     - Check against cached slugs
  3. Benefits:
     - Instant validation feedback
     - No async operations during form validation
     - Efficient resource usage
     - Non-blocking command startup
