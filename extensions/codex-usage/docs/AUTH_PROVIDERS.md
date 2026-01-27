# Authentication Provider Implementation Guide

This document describes how authentication works for each provider in CodexBar.

## Table of Contents

1. [OAuth (GitHub Copilot)](#oauth-github-copilot)
2. [Browser Cookies](#browser-cookies)
3. [CLI Integration](#cli-integration)
4. [API Keys](#api-keys)

---

## OAuth (GitHub Copilot)

GitHub Copilot uses the OAuth 2.0 Device Authorization Grant flow.

### Flow

1. Extension requests device code from GitHub
2. User shown URL and code in Raycast UI
3. User opens URL in browser and enters code
4. Extension polls for access token
5. Token stored in Raycast LocalStorage (encrypted)

### Implementation

```typescript
// Initiate OAuth flow
const success = await initiateGitHubDeviceFlow("copilot");

// Use token for API calls
const token = await getOAuthToken("copilot");
const response = await fetchJSON("https://api.github.com/user/copilot/quota", {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Endpoints

- Device Code: `POST https://github.com/login/device/code`
- Access Token: `POST https://github.com/login/oauth/access_token`
- API: `GET https://api.github.com/user/copilot/quota`

---

## Browser Cookies

Most providers use browser cookies for authentication.

### Supported Browsers

- Chrome
- Edge
- Firefox
- Brave

### Cookie Extraction Process

1. Locate browser's cookie database
2. Decrypt if necessary (Chrome/Edge use DPAPI on Windows)
3. Query for provider-specific cookies
4. Return session tokens

### Cookie Paths

**Windows:**
```
Chrome: %LOCALAPPDATA%/Google/Chrome/User Data/Default/Network/Cookies
Edge: %LOCALAPPDATA%/Microsoft/Edge/User Data/Default/Network/Cookies
Firefox: %APPDATA%/Mozilla/Firefox/Profiles/*/cookies.sqlite
```

**macOS:**
```
Chrome: ~/Library/Application Support/Google/Chrome/Default/Cookies
Edge: ~/Library/Application Support/Microsoft Edge/Default/Cookies
Firefox: ~/Library/Application Support/Firefox/Profiles/*/cookies.sqlite
```

### Required Cookies per Provider

| Provider | Domain | Cookies |
|----------|--------|---------|
| Codex | `openai.com` | `__Secure-next-auth.session-token` |
| Claude | `claude.ai` | `sessionKey` |
| Cursor | `cursor.com` | `cursor_session` |
| Gemini | `gemini.google.com` | `__Secure-ENID` |
| Kimi | `kimi.moonshot.cn` | `token` |

### Usage

```typescript
const cookie = await getCookieValue("chrome", "openai.com", "__Secure-next-auth.session-token");
```

---

## CLI Integration

Some providers offer CLI tools that expose usage data.

### Supported CLI Tools

| Tool | Command | Usage Command |
|------|---------|---------------|
| Claude | `claude` | `claude /usage` |
| Kiro | `kiro` | `kiro usage` |
| Augment | `auggie` | `auggie usage` |

### Detection Process

1. Check if command exists in PATH
2. Check standard installation paths
3. Verify CLI is authenticated
4. Execute usage command
5. Parse output

### Implementation

```typescript
// Detect CLI
const result = await detectCLI("claude");
if (result.isInstalled && result.isAuthenticated) {
  const output = await fetchUsageFromCLI("claude", result.path!);
  const usage = parseCLIOutput(output, "claude");
}
```

### CLI Output Format

CLIs typically output JSON:

```json
{
  "requests_today": 45,
  "daily_limit": 100,
  "requests_this_week": 156,
  "weekly_limit": 500,
  "resets_at": "2026-01-27T12:00:00Z"
}
```

---

## API Keys

Some providers support direct API key authentication.

### Supported Providers

- Kimi (Kimi K2)
- Synthetic providers

### Storage

API keys are stored securely in Raycast's encrypted LocalStorage:

```typescript
// Store API key
await setAPIKey("kimi", "sk-...");

// Retrieve API key
const apiKey = await getAPIKey("kimi");

// Use in API calls
const response = await fetchJSON("https://api.moonshot.cn/v1/usage", {
  headers: { Authorization: `Bearer ${apiKey}` },
});
```

### Security

- Keys are encrypted at rest
- Keys are only transmitted to provider APIs
- Keys can be deleted at any time

---

## Adding a New Provider

To add authentication for a new provider:

1. Determine authentication method(s)
2. Implement the appropriate authentication module
3. Add to provider configuration
4. Update UI for configuration

### Example: Adding OAuth Provider

```typescript
// In your provider class
async authenticate(): Promise<boolean> {
  return initiatePKCEFlow(this.id, {
    clientId: "your-client-id",
    authorizationEndpoint: "https://provider.com/oauth/authorize",
    tokenEndpoint: "https://provider.com/oauth/token",
    scope: "read:usage",
  });
}
```

### Example: Adding Cookie Provider

```typescript
// In your provider class
async isConfigured(): Promise<boolean> {
  this.sessionToken = await getCookieValue(
    this.config.cookieSource,
    "provider.com",
    "session_cookie_name"
  );
  return this.sessionToken !== null;
}
```

---

## Error Handling

Common authentication errors:

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Token expired | Re-authenticate |
| Cookie not found | Not logged in | Login in browser |
| CLI not found | Not installed | Install CLI tool |
| DPAPI error | Windows encryption | Run with correct permissions |

---

## Testing

Test authentication with:

```bash
# Test OAuth flow
npm run test:oauth -- --provider=copilot

# Test cookie extraction
npm run test:cookies -- --provider=codex --browser=chrome

# Test CLI detection
npm run test:cli -- --tool=claude
```
