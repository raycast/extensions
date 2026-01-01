# AdGuard DNS Helper - Raycast AI Extension

A Raycast AI extension that helps troubleshoot service issues by analyzing AdGuard DNS query logs and unblocking domains through natural language interaction.

## Features

- 🔍 **Query Log Analysis** - Fetch and analyze recent DNS queries to identify blocked domains
- 🤖 **AI-Powered Troubleshooting** - Natural language interaction: "ask @adguard-dns Netflix isn't working"
- ✅ **Confirmation Required** - Always asks for user confirmation before unblocking domains
- ⚡ **Multi-Domain Support** - Unblock multiple domains in a single operation
- 🔄 **Automatic Token Refresh** - Handles AdGuard DNS API authentication automatically

## Screenshots

![Blocked DNS Requests List](metadata/adguard-dns-1.png)
*Visual list view showing blocked domains with device names and attempt counts*

![AI Chat - Blocked Domain Analysis](metadata/adguard-dns-2.png)
*AI-powered troubleshooting identifies blocked domains causing service issues*

![Unblock Confirmation Dialog](metadata/adguard-dns-3.png)
*Native confirmation dialog before unblocking domains*

## Prerequisites

- Raycast Pro subscription (required for AI extensions)
- AdGuard DNS account with API access
- macOS (Raycast AI extensions are not available on Windows)

## Installation

### 1. Clone or Download

```bash
git clone https://github.com/yourusername/adguard-raycast.git
cd adguard-raycast
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Get AdGuard DNS Credentials

You need three credentials from AdGuard DNS:

#### Get Access and Refresh Tokens

```bash
curl -X POST https://api.adguard-dns.io/oapi/v1/oauth_token \
  -H "Content-Type: application/json" \
  -d '{"username": "your_email@example.com", "password": "your_password"}'
```

This returns:
```json
{
  "access_token": "your_access_token_here",
  "refresh_token": "your_refresh_token_here"
}
```

#### Get DNS Server ID

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.adguard-dns.io/oapi/v1/dns_servers
```

Copy the `id` field from the response (looks like: `"dXXXXXXXXX"`).

### 4. Configure Extension in Raycast

1. Build and import the extension:

```bash
npm run dev
```

2. This will open Raycast and import the extension
3. Go to Raycast Settings → Extensions → AdGuard DNS Helper
4. Fill in the required preferences:
   - **AdGuard API Token**: Your access token
   - **AdGuard Refresh Token**: Your refresh token
   - **DNS Server ID**: Your DNS server ID

## Usage

### Natural Language Interaction

Open Raycast and use the AI chat with the `@adguard-dns` mention:

**Example Queries:**

```
ask @adguard-dns Netflix isn't working
```

```
ask @adguard-dns My banking app won't load
```

```
ask @adguard-dns Show me what's been blocked in the last hour
```

```
ask @adguard-dns Why isn't YouTube loading?
```

### How It Works

1. **User reports issue**: "ask @adguard-dns Netflix isn't working"
2. **AI fetches logs**: Automatically calls the query log tool (default: last 10 minutes)
3. **AI analyzes**: Identifies likely culprits (CDNs, APIs, auth providers)
4. **AI presents findings**: Shows blocked domains with reasoning and confidence levels
5. **User confirms**: User approves the domains to unblock
6. **Confirmation dialog**: Raycast shows a confirmation dialog with domain list
7. **AI unblocks**: After approval, adds whitelist rules to AdGuard DNS
8. **Success**: Confirms domains were unblocked and suggests testing

## Tools

### get-query-log

Fetches recent DNS query logs from AdGuard DNS.

**Parameters:**
- `minutes` (optional): Number of minutes to look back (default: 10)

**Returns:**
- List of blocked domains with timestamps
- Filter rules that blocked them
- Total queries scanned

### unblock-domain

Adds whitelist rules to unblock domains.

**Parameters:**
- `domains`: Array of domains to unblock (e.g., `["netflix.com", "nflxvideo.net"]`)

**Returns:**
- Success confirmation with list of unblocked domains
- Domains that were already whitelisted
- Total whitelist rules count

**Important:** This tool ALWAYS requires user confirmation via Raycast's confirmation dialog.

## Development

### Run in Development Mode

```bash
npm run dev
```

Changes will hot-reload in Raycast.

### Build for Production

```bash
npm run build
```

### Lint

```bash
npm run lint

# Auto-fix linting issues
npm run fix-lint
```

## Project Structure

```
adguard-raycast/
├── src/
│   ├── get-query-log.ts          # Query log fetching tool
│   ├── unblock-domain.ts          # Domain unblocking tool (with confirmation)
│   └── utils/
│       └── adguard-api.ts         # Shared AdGuard API utilities
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## How the AI Works

The extension provides detailed instructions to Raycast AI on how to troubleshoot DNS issues:

1. **Fetch logs** with appropriate time windows
2. **Analyze intelligently** considering:
   - Direct service domain matches
   - CDN providers (Akamai, CloudFront, Fastly)
   - API endpoints and auth services
   - Analytics and tracking domains
   - Timing patterns
3. **Present findings** with reasoning and confidence levels
4. **Always confirm** before unblocking anything
5. **Report success** and suggest testing

## Troubleshooting

### "Token is not configured" error

Make sure you've filled in all three preferences in Raycast Settings → Extensions → AdGuard DNS Helper.

### "Token expired" errors

The extension automatically refreshes tokens. Ensure your refresh token is correct.

### "DNS server not found" (404)

Verify your DNS Server ID is correct by listing your DNS servers:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.adguard-dns.io/oapi/v1/dns_servers
```

### No blocked domains found

- Try expanding the time window (AI should do this automatically)
- Check the AdGuard DNS dashboard to verify domains are actually being blocked
- Ensure the service issue occurred recently

## API Rate Limits

AdGuard DNS API has rate limits. The extension minimizes API calls by:
- Fetching up to 200 entries per query
- Unblocking multiple domains in a single API call
- Only refreshing tokens when they expire (401 response)

## License

MIT

## Credits

Built with [Raycast](https://raycast.com/) - Supercharged productivity

Adapted from the [AdGuard DNS Mastra Agent](https://github.com/kevintraver/mastra-adguard-dns)
