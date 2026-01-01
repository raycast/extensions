# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast AI extension that helps troubleshoot service issues by analyzing AdGuard DNS query logs and unblocking domains through natural language interaction. The extension provides AI tools that fetch DNS query logs and unblock domains via the AdGuard DNS API.

## Development Commands

### Essential Commands
```bash
# Development mode with hot reload (imports extension to Raycast)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Auto-fix linting issues
npm run fix-lint

# Publish to Raycast Store
npm run publish
```

## Architecture

### Extension Structure
The extension follows Raycast's AI tools pattern with four main components:

1. **Commands** (`src/*.tsx`) - Raycast commands with UI views
   - `index.tsx` - Usage information command
   - `review-blocked-domains.tsx` - Interactive UI for reviewing/unblocking domains
2. **Tools** (`src/tools/`) - AI-callable functions (no-view mode)
   - `get-query-log.ts` - Fetch DNS query logs
   - `unblock-domain.ts` - Unblock domains with native confirmation
3. **Utils** (`src/utils/`) - Shared utilities
   - `adguard-api.ts` - API client with token management
   - `domain-helpers.ts` - Domain parsing and root extraction

### API Integration Pattern

The extension uses a centralized API client in `src/utils/adguard-api.ts` that:
- Manages authentication tokens in-memory during extension lifetime
- Automatically refreshes access tokens when they expire (401 responses)
- Provides typed interfaces for AdGuard DNS API responses
- Exports helper functions: `callAdGuardAPI()`, `buildApiUrl()`, `getDnsServerId()`

**Token refresh flow:**
1. First request uses access token from preferences
2. On 401 response, automatically calls refresh endpoint with refresh token
3. Updates in-memory token and retries request
4. All subsequent requests use the refreshed token

### Tool Implementation

Tools are located in `src/tools/` and follow this pattern:
```typescript
type Input = {
  // Tool parameters with JSDoc descriptions (shown to AI)
};

export default async function tool(input: Input): Promise<string> {
  // Implementation that returns formatted string for AI to read
}
```

**AI Tools (no-view mode):**
- **get-query-log.ts** - Fetches DNS query logs, filters for blocked domains, groups by domain, formats results
- **unblock-domain.ts** - Adds whitelist rules using AdGuard DNS syntax (`@@||domain.com^`), shows native `Tool.Confirmation` dialog, automatically defaults to root domains

**Tool.Confirmation Pattern:**
Tools can export a `confirmation` function that shows a native Raycast confirmation dialog before execution:
```typescript
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Unblock domains?",
    info: [{ name: "Domain", value: "example.com" }],
    style: Action.Style.Regular,
  };
};
```
This provides better UX than text-based AI confirmation.

### Root Domain Logic

**Critical behavior**: The extension defaults to unblocking root domains instead of subdomains for broader coverage.

- `www.peacocktv.com` → unblocks `peacocktv.com`
- `api-global.netflix.com` → unblocks `netflix.com`
- Handles multi-part TLDs (`.co.uk`, `.com.au`, etc.)

Implementation in `src/utils/domain-helpers.ts`:
- `getRootDomain(domain)` - Extracts root from subdomain
- `groupByRootDomain(domains)` - Groups subdomains by root
- `isRootDomain(domain)` - Checks if already root

This logic is used by:
- `unblock-domain` tool - Automatically converts subdomains to roots
- `review-blocked-domains` command - Groups UI by root domains
- AI instructions - Presents findings grouped by root

### Two User Flows

**Quick Flow (AI Chat):**
1. User: "Netflix isn't working"
2. AI calls `get-query-log` tool
3. AI analyzes and presents grouped root domains
4. User: "all" or specific domains
5. AI calls `unblock-domain` tool → Native confirmation shows
6. User confirms → Domains unblocked

**Visual Flow (Native UI):**
1. User runs "Review Blocked Domains" command
2. Command fetches last 30 minutes of query logs directly from API (no caching)
3. Shows List grouped by root domains with metadata
4. User clicks domain → Confirmation → Unblock
5. List auto-refreshes after unblock

Both flows use same AdGuard API patterns, same root domain logic, but different UX.

### AI Instructions

The extension's AI behavior is defined in `package.json` under the `ai` field:
- Workflow: fetch logs → analyze → present root domains → offer quick vs visual path
- Emphasizes root domain unblocking by default
- Offers two paths: quick text-based ("all") or visual UI command
- Leverages native `Tool.Confirmation` for safety

## Code Style

- **TypeScript**: Strict mode enabled, no `any` types
- **Prettier**: 120 character line width, semicolons, double quotes, 2-space tabs, trailing commas
- **ESLint**: Uses `@raycast/eslint-config` preset
- **Imports**: Use static imports (not dynamic)

## AdGuard DNS API

### Authentication
The extension requires three credentials configured in Raycast preferences:
- Access token (expires, refreshed automatically)
- Refresh token (long-lived, used to get new access tokens)
- DNS Server ID (identifies which DNS server to query/modify)

### Key Endpoints
- `POST /oapi/v1/oauth_token` - Refresh access token
- `GET /oapi/v1/query_log` - Fetch DNS query logs with time window and limit
- `GET /oapi/v1/dns_servers/{id}` - Get DNS server settings
- `PUT /oapi/v1/dns_servers/{id}/settings` - Update user rules (whitelist/blacklist)

### Query Log Structure
Query logs return items with:
- `domain` - The DNS domain that was queried
- `time_iso` / `time_millis` - When the query occurred
- `filtering_info.filtering_status` - `REQUEST_BLOCKED` or `RESPONSE_BLOCKED` for blocked queries
- `filtering_info.filter_rule` - Which rule blocked the domain

### Whitelist Rule Format
Domains are unblocked using AdGuard DNS syntax: `@@||domain.com^`
- `@@` prefix indicates whitelist (exception) rule
- `||` matches domain and all subdomains
- `^` separator character

## Key Patterns & File References

### API Client Pattern (`src/utils/adguard-api.ts`)
- Token management: In-memory access token, auto-refresh on 401
- `callAdGuardAPI(url, options?)` - Makes authenticated requests with auto-retry
- `buildApiUrl(path)` - Constructs full API URLs
- `getDnsServerId()` - Gets server ID from preferences
- All API calls go through this centralized client

### Domain Parsing (`src/utils/domain-helpers.ts`)
- `getRootDomain(domain)` - Core logic for root extraction (handles `.co.uk` etc)
- `groupByRootDomain(domains)` - Aggregates subdomains under roots
- Used by both AI tools and UI commands

### AI Tool with Confirmation (`src/tools/unblock-domain.ts`)
- Default export: Main tool function (returns string for AI)
- Named export: `confirmation` function (shows native dialog)
- Automatically converts input domains to roots before processing
- Confirmation shows what will actually be unblocked (roots + their subdomains)

### View Command (`src/review-blocked-domains.tsx`)
- React component using Raycast UI primitives (List, ActionPanel, Actions)
- Fetches data directly from AdGuard API (no caching)
- Uses same domain grouping logic as AI tools
- Shows domains grouped by root with metadata (attempts, time ago)
- Unblock action calls same API patterns as tool

## Testing

### Setup
1. Run `npm run dev` to load in Raycast with hot reload
2. Configure credentials in Raycast Settings → Extensions → AdGuard DNS:
   - Access Token, Refresh Token, DNS Server ID (see README.md for obtaining these)

### Testing AI Tools
Open Raycast AI and use `@adguard-dns` mention:
- "Show me what's been blocked in the last 10 minutes"
- "Netflix isn't working" → Should suggest unblock with "all" option
- "all" → Should show native confirmation dialog with root domains
- Verify confirmation shows root domains (e.g., `netflix.com`, not `www.netflix.com`)

### Testing View Command
1. Launch "Review Blocked Domains" command from Raycast
2. Should fetch and display last 30 minutes of blocked domains
3. Verify domains are grouped by root
4. Click domain → Should show confirmation → Unblock
5. List should refresh automatically after unblock
6. Press Cmd+R to manually refresh

### Expected Behavior
- AI tools return strings to AI (logged in AI chat)
- View commands show native Raycast UI
- Both paths use root domain logic
- Native confirmation always shown before unblocking
- Token refresh happens automatically on 401 errors
