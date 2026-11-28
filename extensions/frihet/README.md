# Frihet ERP for Raycast

> **Raycast Store:** Available in the [Raycast Store](https://www.raycast.com/viktor_berthelius/frihet).

Review your daily business brief, search invoices, check client activity, and browse your product catalog from [Frihet ERP](https://frihet.io) directly inside Raycast on macOS.

## Features

- **Business Brief**: Daily operational snapshot separating draft invoices, issued invoices, marked-paid revenue, unpaid and overdue invoices, and recorded expenses — plus prioritized items to review today and clear complete vs. partial coverage indicators.
- **Search Invoices**: Filter and search invoices by number, client, series, or status (`draft`, `sent`, `overdue`, `paid`, `cancelled`), inspect line items and the invoice tax rate, copy invoice numbers, and open the invoices list in [app.frihet.io](https://app.frihet.io).
- **Search Clients**: Look up clients by name, email, or tax ID (NIF/CIF/VAT), copy contact or fiscal details in one action, inspect recent CRM activity, and open the clients list in Frihet.
- **Search Products**: Browse active or inactive products and services by name or SKU, inspect unit pricing and tax rates, and jump directly into your catalog.
- **Switch Workspace & Clear Cache**: Verify the connected Frihet workspace, clear locally cached records on demand, and cleanly isolate data whenever you switch to a different workspace API key.

## Getting Started

1. Sign in to [app.frihet.io](https://app.frihet.io) and open **Settings → API Keys** ([app.frihet.io/settings/api](https://app.frihet.io/settings/api)).
2. Create a Frihet API key (starts with `fri_`).
3. Run any Frihet command in Raycast and paste your key into the **Frihet API Key** preference.

All five native commands connect directly to your Frihet workspace and work on **Raycast Free** — no Raycast Pro or Raycast AI subscription is required.

## Optional: Using `@Frihet` in Raycast AI (MCP)

If you use **Raycast AI**, you can also connect Frihet's remote MCP server (`https://mcp.frihet.io/mcp`) in Raycast's MCP Server settings to chat with `@Frihet` in Quick AI or AI Chat.

This is completely optional and separate from the extension's five native commands, which always authenticate directly with your `fri_...` API key.

## Security & Privacy

- **Strictly Read-Only in Raycast**: Every command in this extension is read-only. Creating, editing, issuing, or cancelling invoices and other fiscal records always happens in [app.frihet.io](https://app.frihet.io).
- **Automatic Workspace Cache Isolation**: Cached data is isolated per workspace and automatically purged whenever you clear cache or switch API keys, preventing cross-workspace leakage.
- **Zero Third-Party Telemetry**: The extension sends no analytics, crash reports, or tracking beacons to third-party services. All requests go directly to Frihet's API.

Learn more in the [Frihet Documentation](https://docs.frihet.io) and our [Privacy Policy](https://www.frihet.io/en/privacy).
