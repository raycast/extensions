# Expiration Reminder Changelog

## [Initial Version] - {PR_MERGE_DATE}

- OAuth 2.0 Authorization Code + PKCE sign-in — no client secret — with secure token storage, proactive/reactive refresh, and server-side revoke on Sign Out.
- **Show Expired Items** and **Show About-To-Expire Items** (server-side 7/30/60/90-day window) with urgency accessories and "Load More" pagination.
- **Search Expirations**, **Search Contacts**, and **Search Files** with debounced, latest-wins server search. File search spans all record types with a deep link to each file's related item.
- **Show a Contact's Expirations** drill-down.
- **Create an Expiration** and **Create a Contact** form commands.
- Shared Detail view with metadata sidebar, plus "Open in Web App" and copy actions across commands.
- Resilient API client: exponential backoff + jitter on 429/5xx (honors `Retry-After`), silent refresh-and-retry on 401.
- Opt-in, PII-free usage telemetry (off by default).
