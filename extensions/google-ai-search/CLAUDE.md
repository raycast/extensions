# Google AI Search Raycast Extension

## Developer Overview
I am a senior engineer with decades of experience.  I am very new to using Agentic patterns for code creation and completion.  Please assume that I know how to structure and architect code, as well as most best practices.

We need to write real tests to allow each new feature and iteration to be tested appropriately.

I will expect you to have read relevant API docs, so please ingest them or ask me what API docs may be needed

## Project Overview
This is a Raycast extension that provides Google AI Overview-style search results powered by Google Gemini AI. Users can search, get AI-powered summaries with real sources, and manage their search history.

## Architecture
- **Frontend**: React TypeScript components using Raycast API
- **AI Provider**: Google Gemini (via @google/generative-ai)
- **Search Sources**: Google Custom Search API (optional, with smart fallbacks)
- **Storage**: Raycast LocalStorage for search history and location cache
- **UI Pattern**: List (search) → Detail (AI Overview with sources)
- **Location**: Automatic location detection via CoreLocationCLI or IP geolocation

## Key Files
- `src/search.tsx` - Main extension with search interface and AI overview display
- `package.json` - Extension configuration and dependencies

## Core Features
1. **AI Overviews**:
   - Streaming Gemini responses formatted like Google AI Overview
   - Context-aware formatting (products, health, concepts, how-tos)
   - 200-300 word summaries with structured sections
   - Inline source citations [1], [2], [3]
2. **Real Sources**: Integration with Google Custom Search API for actual sources
3. **Search History**: Persistent history with individual/bulk deletion
4. **Keyboard Navigation**: Full keyboard shortcuts for all actions
5. **Copy Formatting**: Copy AI overview to clipboard
6. **UX Features**:
   - Animated toasts for status updates (Searching, Generating, Thinking, Ready)
   - `isLoading` property shows loading bar in Detail view
   - Query displayed as blockquote at top of content
   - Navigation title shows query in bottom left
7. **Location Detection**:
   - Automatic location via CoreLocationCLI (if installed) or IP geolocation
   - 24-hour cache for location data
   - Smart query enhancement for location-based searches

## API Dependencies
- **Required**: Google Gemini API key (from Google AI Studio)
- **Optional**: Google Custom Search API + Search Engine ID (for real sources)

## Development Notes
- Uses Raycast's Form, Detail, List, and ActionPanel components
- TypeScript errors with Raycast components are cosmetic (React 18/19 compatibility)
- Search history limited to 20 items, stored in JSON format
- Fallback sources used when Custom Search API not configured

## Type Safety Best Practices
**IMPORTANT**: Always use official package types instead of creating custom ones:
- Google APIs
- Raycast Extension(s) API
- other APIs or libs actively being used in codebase

### Why This Matters
1. **Compile-time error detection** - Catches API misuse early
2. **Better IDE support** - Accurate auto-completion in Zed/VS Code
3. **Self-documenting** - Types show exactly what's available
4. **Future-proof** - Updates automatically with package updates

### Navigation Bug Prevention
The `replace()` function does not exist in Raycast's Navigation API. Using proper types prevents:
- Runtime TypeErrors when calling non-existent methods
- Navigation bugs requiring multiple back button presses
- Silent failures from undefined function calls

## Extension Preferences
- `geminiApiKey` (required): Google AI API key
- `model` (optional): Gemini model selection (2.0 Flash, 1.5 Pro, 1.5 Flash)
- `googleSearchApiKey` (optional): For real search results
- `googleSearchEngineId` (optional): Custom search engine ID
- `googleMapsPlatformApiKey` (optional): For Maps Static API and Places API

## UI Components
- `Command()` - Main List component with search bar, suggestions, and history
- `AIOverviewView()` - Detail view with streaming AI response, sources in metadata panel

## User Flow & Quick Access
The extension supports two primary usage patterns:

### 1. Standard Search
- Open Raycast → Select "Google AI Overview" → Type query → Press Enter
- Shows List with search suggestions and history
- Select suggestion or press Enter to search

### 2. Tab-to-Search (Recommended for Power Users)
- Open Raycast → Type "Google AI Overview" → Press ⇥ (Tab) → Type query → Press ↵ (Enter)
- Bypasses the List view and goes directly to AI results
- Fastest way to get answers

### Raycast Search Bar Limitation
- Typing in Raycast's main search bar and selecting the extension does NOT pass the search text
- This is a Raycast platform limitation, not an extension bug
- Use tab-to-search instead for quick queries

### Quicklinks (Optional)
Users can create custom Raycast Quicklinks for frequently used queries:
- "AI Weather" → Pre-fills "weather today"
- "AI Code Help" → Pre-fills "programming question about"
- Assignable to custom keyboard shortcuts

## Development Commands
- `npm run dev` - Development mode
- `npm run build` - Build extension
- No lint/typecheck commands configured yet

## Debugging
- You may need to ingest docs from the APIs listed above, here are the relevant API docs:
  - [Gemini API](https://developers.google.com/gemini/docs)
  - [Google Cloud API](https://cloud.google.com/docs)
  - [Raycast API](https://developers.raycast.com/docs)
- Keys may be needed to read docs or to fetch data from APIs, you can get these from the private `.env` file be sure to clarify which are used for what purpose.

### References materials
https://cse.google.com/cse?cx=200535c615d37465c

### More API docs to ingest
- Fetch(https://ai.google.dev/gemini-api/docs)
- Fetch(https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list)
- Fetch(https://developers.raycast.com/api-reference/user-interface)
- Fetch(https://developers.raycast.com/api-reference/utilities)

## TODOs
- TODO add the ability to follow up on an intent to further refine it in Gemini
- TODO enhance weather page to show details in meta panel
