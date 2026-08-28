# Contra for Raycast

Track your Contra finances, invoices, revenue, and active projects — without leaving Raycast.

## Commands

- **Finance Dashboard** — available / pending / escrow balance, recent revenue, outstanding & past-due invoices, and recent wallet transactions.
- **Active Projects** — engagements derived from your sent invoices, grouped by linked project with client, status, and totals.
- **Create Invoice** — draft a standalone invoice (client, line items, due date, fees) with a preview step before it is sent.
- **Contra Menu Bar** — pending balance in the menu bar, past-due alerts, and the next due invoice (refreshes every 30 min).

## How it works

There is no public Contra REST API. Contra exposes an official **MCP server** at `https://contra.com/mcp`, secured with standard OAuth 2.0 (PKCE + dynamic client registration). This extension:

1. Registers a public OAuth client dynamically on first launch (`/api/mcp/oauth/register`).
2. Runs Raycast's PKCE flow against `/api/mcp/oauth/authorize` → `/api/mcp/oauth/token` (scope `mcp:tools`).
3. Acts as an **MCP client** (`@modelcontextprotocol/sdk`, streamable HTTP) and calls Contra tools such as `list_invoices_sent`, `list_contractor_transactions`, and `list_chat_conversations`.

Tokens (and the registered `client_id`) are stored in Raycast's secure OAuth storage / `LocalStorage`. Sign in once; refresh tokens keep the session alive.

## Develop

```bash
npm install
npm run dev      # ray develop — opens the commands in Raycast
npm run lint     # ray lint
```

## Notes / limitations

- "Recent Revenue" is summed over the loaded transaction window (last ~50 wallet transactions), excluding payouts and bill payments — not an all-time figure.
- Active projects are derived from invoices' `linkedProject` field — Contra exposes no standalone "list projects" tool, so engagements without invoices won't appear.
- Money values from the wallet arrive as `CURRENCY:amount` (e.g. `USD:495.00000000`) and are parsed/formatted client-side.
