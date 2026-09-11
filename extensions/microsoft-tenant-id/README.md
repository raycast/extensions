# Microsoft Tenant ID

Look up the **Microsoft Entra (Azure AD) tenant ID** for any domain, email address, or URL — right from Raycast. Resolve one domain or a whole list at once, see the organization name and sign-in type, and copy the result in whatever format you need. You can also go the other way — paste a tenant ID to reveal the organization behind it.

## Why use it

A tenant ID is a small thing you end up needing surprisingly often:

- **Wire up CLI tools and scripts** — paste it straight into `az login --tenant`, `Connect-AzAccount -TenantId`, `Connect-MgGraph -TenantId`, or an app's authority URL.
- **Set up cross-tenant collaboration** — B2B guest access, cross-tenant sync, and conditional access all key off the other organization's tenant ID.
- **Identify who's behind a domain** — confirm the organization and whether its Microsoft 365 is managed or federated (ADFS).
- **Decode sign-in errors, tokens, and logs** — turn a bare tenant GUID from an `AADSTS` error, a JWT, or an audit log back into a recognizable organization name.
- **Size up partners and prospects fast** — see in seconds whether a company runs on Microsoft Entra, and grab its tenant ID.
- **Co-sell with Microsoft** — confirm you and your Microsoft contact mean the same customer, and use the exact tenant ID when submitting engagements, referrals, tickets, or claims in Partner Center.
- **Onboard and manage customer tenants** — pin down the managing and customer tenant IDs for Azure Lighthouse delegations, or identify tenants when managing customers at scale in Microsoft 365 Lighthouse.

## How it works

Every Microsoft Entra tenant exposes a public OpenID Connect discovery document at:

```
https://login.microsoftonline.com/<domain>/v2.0/.well-known/openid-configuration
```

The tenant ID (a GUID) is embedded in the `issuer` URL of that document. This extension reads that endpoint for whatever you type and pulls out the tenant ID, then enriches it with the organization name and authentication type from the public `getuserrealm.srf` endpoint. No authentication and no API key required — it only uses public metadata.

## Commands

### Find Tenant ID

Search-as-you-type lookup with a rich detail view.

- Accepts a **domain** (`contoso.com`), an **email address** (`alice@contoso.com`), or a **URL** (`https://www.contoso.com/team`) — the input is normalized automatically.
- **Bulk lookups**: paste several domains separated by commas, tabs, spaces, semicolons, or new lines to resolve them all in parallel, one result row each.
- Shows the tenant ID plus the **organization name**, **authentication type** (Managed or Federated), **national cloud**, region scope, and handy links.
- **Recent lookups** are remembered and shown when the search bar is empty — re-run or remove any of them.
- Can be launched with an argument or as a **Quicklink**, so you can wire it to a hotkey or pass a domain in directly.

### Resolve Tenant ID from Clipboard

A no-view command: reads the domain from your **current selection** (or the clipboard as a fallback), resolves it, copies the tenant ID, and shows the result in a HUD. Paste a list and it copies every tenant ID as CSV.

### Find Organization by Tenant ID (reverse lookup)

The forward commands need no sign-in. **Reverse lookup is a little different.** Well-known **personal-account** tenant IDs — the shared consumer tenants behind outlook.com, hotmail.com, live.com, and Microsoft accounts on other domains — are recognized **instantly, with no sign-in**. For an **organization** tenant ID, going from **ID → organization name + domain** is only possible through Microsoft Graph's [`findTenantInformationByTenantId`](https://learn.microsoft.com/graph/api/tenantrelationship-findtenantinformationbytenantid), which requires an authenticated call — so the first time you resolve an org tenant, the command asks you to sign in with a **work or school** Microsoft account.

Paste a tenant GUID and it returns the tenant's **organization display name** and **default domain** (`*.onmicrosoft.com`). Great for turning a tenant ID from a token, log, or sign-in error into a recognizable organization.

> Sign-in uses a **public client + PKCE flow with no client secret**, and a multitenant app registration is **built in** — there's nothing to configure. You're only prompted the first time you resolve an **organization** tenant ID; personal-account tenant IDs need no sign-in. Each user signs into their own tenant and consents to a single low-privilege scope, `CrossTenantInformation.ReadBasic.All`. Tokens are stored locally in your Raycast; nothing is hosted or shared. Reverse lookup covers the commercial cloud.

## Signing in

Nothing to set up. **Personal-account tenant IDs** resolve instantly with no sign-in. The first time you resolve an **organization** tenant ID, Raycast opens a Microsoft sign-in in your browser — approve the one-time consent and you're done. You can **Sign out** anytime from the command's actions.

**Sign-in requires a work or school account.** Personal Microsoft accounts can't be used to sign in — Microsoft Graph's reverse-lookup API doesn't support them as the caller. So if you only have a personal account, you can still use every no-sign-in feature (the forward lookups and personal-account tenant IDs), but resolving an arbitrary _organization_ tenant ID needs a work or school account. Don't have one? You can create a free [Microsoft Entra](https://entra.microsoft.com/) directory and sign in with an account from it.

### Built-in app registration

The default Application (client) ID points at a **multitenant public-client** Entra app registration owned by the extension author (`Rediwed`). It is not a secret (PKCE public client, no client secret). The author keeps that registration registered for as long as this extension is published in the Raycast Store. If you prefer not to use it — or your organization requires its own app — set **Application (Client) ID** in the extension preferences to a registration you control (enable public client flows, redirect URI `https://raycast.com/redirect?packageName=Extension`, delegated permission `CrossTenantInformation.ReadBasic.All`).

## Copy formats

From any result you can copy the tenant ID, or via **Copy as…**:

- Login authority URL (`https://login.microsoftonline.com/<tenant-id>`)
- Azure CLI — `az login --tenant <id>`
- Azure PowerShell — `Connect-AzAccount -TenantId <id>`
- Microsoft Graph PowerShell — `Connect-MgGraph -TenantId <id>`
- JSON
- Domain

For bulk results, **Copy All as CSV** and **Copy All Tenant IDs** are available too.

## National clouds

Domains are checked in parallel against the commercial, **US Gov** (GCC High / DoD), and **China (21Vianet)** clouds. The result shows which cloud a tenant lives in, and the Open actions point at the matching portals.

## Notes

- Not every domain maps to a Microsoft tenant — if the domain isn't backed by Entra, you'll see a "No Microsoft tenant found" message.
- The lookup only reveals a tenant's existence and its ID, both of which are public information.
