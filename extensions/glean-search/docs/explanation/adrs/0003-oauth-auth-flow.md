---
status: accepted
date: 2026-06-26
decision-makers: faizhasim
---

# OAuth Auth Flow with Email Fallback

## Context and Problem Statement

The extension needs to authenticate users with their company's Glean instance. Glean uses OAuth for authentication, but the server URL varies per organisation (e.g., `company.glean.com`).


```mermaid
sequenceDiagram
    actor User
    participant Ext as Raycast Extension
    participant CLI as Glean CLI
    participant Browser
    participant Glean as Glean Server

    User->>Ext: Launch Search Glean
    Ext->>CLI: checkGleanAuth()
    CLI-->>Ext: Not authenticated

    alt Server URL cached
        Ext->>Browser: Open OAuth URL
        Browser->>Glean: Authenticate
        Browser-->>User: Sign-in prompt
        User->>Browser: Complete sign-in
        Browser-->>Ext: OAuth callback
    else First time - no server URL
        Ext-->>User: Prompt for email
        User->>Ext: Enter work email
        Ext->>CLI: glean auth login --email
        CLI->>Glean: Look up server URL
        Glean-->>CLI: Server URL
        CLI-->>Ext: Cache URL in config.json
        Ext->>Browser: Open OAuth URL
        Browser->>Glean: Authenticate
        Browser-->>User: Sign-in prompt
        User->>Browser: Complete sign-in
        Browser-->>Ext: OAuth callback
    end

    Ext->>CLI: glean search --json <query>
    CLI->>Glean: Search API
    Glean-->>CLI: JSON results
    CLI-->>Ext: Parsed results
    Ext-->>User: Display results
```
How should the extension discover the Glean instance and authenticate the user?

## Decision Drivers

- Authentication should work with minimal user friction
- The extension must handle the first-time case where the Glean server URL is unknown
- The Glean server URL should be cached so subsequent launches skip the discovery step
- The solution should use the Glean CLI's built-in authentication rather than implementing OAuth from scratch
- The email used for discovery must not be stored or transmitted beyond the instance lookup

## Considered Options

- **Email-based instance discovery followed by browser OAuth** — prompt for email, look up the Glean server URL, then open the browser for OAuth
- **Manual server URL entry** — ask the user to enter their company's Glean URL directly
- **CLI-managed auth only** — delegate the entire flow to `glean auth login` without any extension-side handling
- **Embedded OAuth flow** — implement OAuth PKCE directly in the extension without depending on the CLI

## Decision Outcome

Chosen option: **Email-based instance discovery followed by browser OAuth**, because:

- The email lookup is a one-time cost — the server URL is cached in `~/.glean/config.json`
- Subsequent launches open the browser directly for OAuth, skipping the email prompt
- The Glean CLI handles the OAuth handshake, so the extension does not implement any OAuth protocol logic
- The email is used only for the discovery API call (via the CLI) and is not stored by the extension

### Consequences

- Good, because the user only enters their email once
- Good, because the OAuth flow uses the system browser, inheriting existing session cookies and corporate SSO
- Good, because the extension avoids implementing OAuth protocol logic, reducing security risk
- Good, because the Glean CLI caches the authentication token, so the extension does not need to manage credentials
- Bad, because the first-time flow requires two steps (email entry, then browser OAuth)
- Bad, because if the email lookup fails (e.g., mistyped email, unknown domain), the user sees an error with no clear recovery path

### Confirmation

The auth flow is implemented in `src/lib/auth.ts` and orchestrated by `src/lib/glean.ts`. On mount, `useGlean` calls `checkGleanAuth()` to verify the session. If unauthenticated, it checks for a cached server URL — if present, it opens the browser for OAuth directly; if absent, it sets `needsEmail = true` to prompt the user.

## Pros and Cons of the Options

### Email-based instance discovery followed by browser OAuth

Prompt the user for their work email on first use, use it to discover the Glean server URL, then open the browser for OAuth.

- Good, because it works with any Glean instance without the user needing to know their server URL
- Good, because the email is used once and not stored by the extension
- Good, because the cached server URL makes subsequent sign-ins seamless
- Bad, because the first-time flow has an extra step (email entry)
- Bad, because the user must know their work email associated with their company's Glean instance

### Manual server URL entry

Ask the user to type or paste their company's Glean server URL directly.

- Good, because it is simple and has no external dependency for instance discovery
- Good, because there is no email lookup that could fail or be blocked
- Bad, because most users do not know their Glean server URL
- Bad, because it creates support burden when users enter incorrect URLs
- Bad, because the URL format varies (some companies use a subdomain, others a custom domain)

### CLI-managed auth only

Run `glean auth login` without any extension-side handling, relying on the CLI to prompt the user for everything.

- Good, because the extension code is minimal
- Good, because the CLI handles all auth logic and edge cases
- Bad, because the CLI's interactive prompts do not work well in a non-TTY Raycast child process
- Bad, because the CLI's email prompt would block indefinitely when stdin is not connected to a terminal
- Bad, because the extension cannot control the UX — no loading states, error messages, or sign-in progress

### Embedded OAuth flow

Implement OAuth PKCE directly in the extension, managing tokens, refresh, and storage in extension code.

- Good, because the extension has full control over the auth UX
- Good, because there is no dependency on the Glean CLI for authentication
- Bad, because implementing OAuth correctly is complex and error-prone
- Bad, because the extension would need to manage token refresh, storage, and revocation
- Bad, because any OAuth protocol changes by Glean would require an extension update
- Bad, because the security review burden for credential management code is high
