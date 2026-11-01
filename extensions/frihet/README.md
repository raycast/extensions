# Frihet ERP for Raycast

Search invoices, inspect client CRM timelines, browse products, and generate a deterministic operational business brief from [Frihet ERP](https://frihet.io) directly inside Raycast on macOS.

## Features

- **Business Brief (`business-brief`)**: Deterministic operational & cashflow snapshot separating collected revenue (`paid`), open receivables (`sent` + `overdue`), overdue exposure, and tax-deductible vs non-deductible expenses. Explicitly labels coverage as `COMPLETE` or `PARTIAL` if any upstream endpoint degrades or paginates beyond the quick-brief window.
- **Search Invoices (`search-invoices`)**: Instant query across invoice numbers, client names, series, and statuses (`draft`, `sent`, `overdue`, `paid`, `cancelled`) with line-item detail inspection, VeriFactu hash-chain badges, and 1-key deep links to `https://app.frihet.io`.
- **Search Clients (`search-clients`)**: Lookup customers by name, email, or tax ID (`NIF`/`CIF`/`VAT`), copy fiscal identifiers, and inspect their latest CRM activity timeline (`GET /v1/clients/:id/activities`).
- **Search Products & Catalog (`search-products`)**: Browse active or inactive catalog items (`SKU`, unit price, tax rate) with resilient client-side fallback if the upstream `isActive` query filter is unavailable.
- **Switch Workspace & Cache Reset (`switch-workspace`)**: Verify the active workspace connection (`GET /v1/context`), inspect isolated tenant cache entries, and atomically abort in-flight requests + purge cached records when rotating API keys.

## Getting Started (Native Raycast Commands)

1. Sign in to [app.frihet.io](https://app.frihet.io) and navigate to **Settings → API Keys** (`https://app.frihet.io/settings/api`).
2. Generate a Frihet API key starting with `fri_...`.
3. Open any Frihet command in Raycast and paste your `fri_...` API key into the **Frihet API Key** preference (`type: "password"`).

All native commands authenticate directly against `https://api.frihet.io/v1` using your `X-API-Key` header and work on **Raycast Free** without requiring a Raycast Pro or Raycast AI subscription.

## Optional: Using `@Frihet` in Raycast AI (MCP)

If you also use **Raycast AI** and want conversational tool access via `@Frihet`, you can register the remote Frihet MCP server (`https://mcp.frihet.io/mcp`) in Raycast's MCP Server configuration.

- **Two independent contexts**: Raycast's MCP integration (`@Frihet` in Quick AI / AI Chat) runs in Raycast's internal MCP host, whereas the 5 native commands in this extension talk directly to `https://api.frihet.io/v1` via `@raycast/api` preferences.
- **Why native commands use `fri_...` API keys in Alpha (Gate 0 Architecture Record)**:
  - `https://mcp.frihet.io/authorize` serves the Cloudflare Durable Object MCP runtime (`McpAgent`) using Dynamic Client Registration (`/register`) and issues internal Worker session tokens bound to `/mcp` (or returns HTTP `503 temporarily_unavailable` when the full-profile OAuth gate is active), rather than issuing `fri_...` REST API keys for `https://api.frihet.io/v1`.
  - `https://openai-mcp.frihet.io/authorize` and `https://claude-mcp.frihet.io/authorize` enforce connector-specific resource indicators (`https://openai-mcp.frihet.io/mcp`, `https://claude-mcp.frihet.io/mcp`), redirect URI allowlists (`https://chatgpt.com/connector_platform_oauth_redirect`, `https://claude.ai/api/mcp/auth_callback`), and QA UID admission gates.
  - Using a standard `fri_...` API key stored in Raycast's encrypted password preference (`getPreferenceValues()`) guarantees zero-config reliability across all Frihet workspaces on `https://api.frihet.io/v1`.

## Security, Privacy & Read-Only Alpha Scope

- **Read-Only Alpha (`READ-01` / `FISC-01`)**: Every command in the Alpha release is strictly read-only (`GET /v1/context`, `GET /v1/invoices`, `GET /v1/invoices/:id`, `GET /v1/clients`, `GET /v1/clients/:id/activities`, `GET /v1/products`, `GET /v1/quotes`, `GET /v1/expenses`). Creating, issuing, or mutating VeriFactu / AEAT / TicketBAI / Facturae fiscal records is intentionally excluded from command-palette shortcuts and delegated to verified web flows in `https://app.frihet.io`.
- **Tenant Isolation (`AUTH-02`)**: All in-memory cached responses are partitioned by a SHA-256 fingerprint of `(apiBaseUrl, apiKey)`. Rotating or clearing the API key immediately aborts in-flight `AbortController` requests and purges previous tenant state.
- **Zero Third-Party Telemetry**: This extension sends zero analytics, crash reports, or tracking beacons to third-party services. Network requests are sent exclusively to `https://api.frihet.io/v1`.
