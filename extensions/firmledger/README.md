# FirmLedger for Raycast

Search, verify and manage [FirmLedger](https://firmledger.co.ke) business records without leaving Raycast. FirmLedger is a verified business record layer: every approved listing carries an ownership check, a confidence score and a verification date.

The extension connects to the FirmLedger MCP server at `https://mcp.firmledger.co.ke/mcp` and covers all 51 of its tools.

## Getting started

1. Install the extension and open any FirmLedger command.
2. Your browser opens FirmLedger's approval page. Choose the permissions you want to grant and approve.
3. Return to Raycast. You are signed in.

Sign-in uses OAuth 2.1 with PKCE. Your password never reaches Raycast, access tokens last 8 hours and refresh automatically.

The open directory tools (search, browse, compare, categories, countries, plans) work with no account at all.

## Commands

| Command | What it does |
| --- | --- |
| Search Listings | Search the directory by name or keyword. Filter by type and verified status. |
| Browse Categories & Countries | Browse listings by category or country. |
| Compare Listings | Compare 2 to 4 companies side by side. |
| Check Domain | List every FirmLedger record that uses a website domain (Pro). |
| Add a Listing | Prepare a pre-filled link to the FirmLedger submission form. Creates nothing. |
| My Listings | Your listings with analytics, edits, score refresh, jobs, revenue, advertising, claims and removal. |
| Leads Inbox | Received, sent and archived leads. Reply, set status, archive or delete. |
| Watchlist | Companies you watch. Add, remove and export to CSV. |
| Notifications | Read notifications and mark them as read. |
| Support Tickets | Read, open and reply to support tickets. |
| Jobs Board | Search open jobs. Post and manage your own. |
| Audience Analytics | Views, clicks and leads for your listings. |
| Pro Plans & Advertising | See plans and ad packages and prepare checkout links. Nothing is charged. |
| Developer: Keys, Webhooks & API Status | API status, API keys and webhooks. |
| Connection & Access | Sign in or out, check your access level, verify the live tool catalog. |
| Help, Terms & Privacy | Help Centre, Terms of Use, Privacy Policy, setup guide and support. |
| All 51 Tools | Run any FirmLedger MCP tool through a generated form. |

## Access levels

| Level | What you can do |
| --- | --- |
| No account | Open directory tools: search, browse, compare, categories, countries, plans, advertising packages and submission links. |
| Signed in | Everything above, plus your account tools such as listings, leads, watchlist and notifications. |
| FirmLedger Pro | Pro directory tools: domain check, relationships, news and jobs search. The 14-day trial counts. |

When a tool needs Pro or an extra permission, the error message includes an **Open Link** action that takes you to the right page.

## Preferences

| Preference | Description |
| --- | --- |
| Connection Method | **Sign in with FirmLedger (OAuth)** is the default. Choose **API Key** if you prefer to use a key. |
| API Key | Only used with the API Key method. Create one in Dashboard, Developer API. Tick `read:listings`, plus `read:account` and `write:account` for account tools. |
| MCP Endpoint | Leave as the default, `https://mcp.firmledger.co.ke/mcp`. |

## Safety and privacy

- Every account change follows FirmLedger's handshake. The extension first asks the server to prepare the change, nothing is written, then shows a confirmation dialog with the exact summary, and only then executes it with a one-time token. Choosing Cancel makes no second call.
- Checkout links are never completed by the extension. You review and pay on FirmLedger.
- Credentials are kept in Raycast's secure preference storage and OAuth token store, and are sent only to your configured MCP endpoint.
- Signing out revokes the connection on FirmLedger and removes the local token.

Read the [Terms of Use](https://firmledger.co.ke/terms) and [Privacy Policy](https://firmledger.co.ke/privacy).

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Sign-in expired | Run **Connection & Access**, then **Sign in**. |
| Pro required or permission required | Use the **Open Link** action on the error to upgrade or adjust permissions. |
| Cloudflare challenge or non-JSON response | Keep the default endpoint `https://mcp.firmledger.co.ke/mcp`. |
| A tool seems missing | Run **Connection & Access**, then **Verify live tool catalog** to compare this extension with the server. |

## Support

- [Help Centre](https://firmledger.co.ke/help)
- [AI assistant setup guide](https://firmledger.co.ke/docs/mcp)
- support@firmledger.co.ke

## Development

```bash
npm install
npm run dev        # ray develop
npm run typecheck
npm test           # offline tests against a mock MCP server
npm run lint
npm run build
```

## License

[MIT](LICENSE) © 2026 FirmLedger
