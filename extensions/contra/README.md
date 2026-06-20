# Contra for Raycast

Track your Contra finances, invoices, revenue, and active projects — without leaving Raycast.

## Commands

- **Finance Dashboard** — available / pending / escrow balance, recent revenue, outstanding & past-due invoices, and recent wallet transactions.
- **Active Projects** — your agentic-work projects with client and the next linked invoice due date.
- **Create Invoice** — draft a standalone invoice (client, line items, due date, fees) with a preview step before it is sent.
- **Contra Menu Bar** — pending balance in the menu bar, past-due alerts, and the next due invoice (refreshes every 30 min).

## How it works

There is no public Contra REST API. Contra exposes an official **MCP server** at `https://contra.com/mcp`, secured with standard OAuth 2.0 (PKCE + dynamic client registration). This extension:

1. Registers a public OAuth client dynamically on first launch (`/api/mcp/oauth/register`).
2. Runs Raycast's PKCE flow against `/api/mcp/oauth/authorize` → `/api/mcp/oauth/token` (scope `mcp:tools`).
3. Acts as an **MCP client** (`@modelcontextprotocol/sdk`, streamable HTTP) and calls Contra tools such as `list_invoices_sent`, `list_contractor_transactions`, and `agentic_work_list_projects`.

Tokens (and the registered `client_id`) are stored in Raycast's secure OAuth storage / `LocalStorage`. Sign in once; refresh tokens keep the session alive.

## Develop

```bash
npm install
npm run dev      # ray develop — opens the commands in Raycast
npm run lint     # ray lint
```

## Publishing

Before `npm run publish`:

- Set `author` in `package.json` to your **raycast.com username** (the current value is a placeholder and will fail validation).
- Replace `assets/extension-icon.png` with a final 512×512 icon if desired.
- Add screenshots under `metadata/` per the Raycast store guidelines.

## Notes / limitations

- "Recent Revenue" is summed over the loaded transaction window (last ~50 wallet transactions), excluding payouts and bill payments — not an all-time figure.
- Agentic-work projects don't carry their own due dates; due dates shown on projects come from their linked invoices.
- Money values from the wallet arrive as `CURRENCY:amount` (e.g. `USD:495.00000000`) and are parsed/formatted client-side.
