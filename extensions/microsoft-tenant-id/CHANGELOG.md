# Microsoft Tenant ID Changelog

## [Recognize personal-account tenant IDs] - {PR_MERGE_DATE}

- **Find Organization by Tenant ID** now recognizes the well-known **personal-account (consumer) tenant IDs** — the shared tenants behind outlook.com, hotmail.com, live.com, and Microsoft accounts on other domains — and labels them instantly **without any sign-in**. The detail view explains what the tenant is, lists example domains that map to it, and links its live OpenID configuration.
- **Sign-in is now lazy**: the command only prompts you to sign in when you look up an *organization* tenant that actually needs Microsoft Graph. Opening the command, or resolving a personal-account tenant ID, no longer forces a sign-in.

## [Reverse lookup by Tenant ID] - {PR_MERGE_DATE}

- New **Find Organization by Tenant ID** command: reverse-resolve a tenant GUID to its **organization name** and **default domain** via Microsoft Graph.
- **Zero-setup sign-in**: a built-in multitenant app registration means you just click **Sign in with Microsoft** — no client ID to paste. Uses a **public-client PKCE flow** (no client secret) with the least-privilege `CrossTenantInformation.ReadBasic.All` scope; each user signs into their own tenant and tokens stay local.

## [Bulk lookups, org details & more] - {PR_MERGE_DATE}

- **Bulk lookups**: resolve many domains at once (comma, tab, space, semicolon, or newline separated), one result row each.
- **Organization name** and **authentication type** (Managed / Federated) now shown for each tenant.
- **National clouds**: automatically checks the commercial, US Gov (GCC High / DoD), and China (21Vianet) clouds.
- **Recent lookups** history, shown when the search bar is empty.
- New **Resolve Tenant ID from Clipboard** no-view command (uses the current selection or clipboard).
- **Command argument + Quicklink** support on Find Tenant ID.
- More **copy formats**: login authority URL, Azure CLI, Azure PowerShell, Microsoft Graph PowerShell, JSON, and bulk CSV / tenant-ID list.

## [Initial Version] - {PR_MERGE_DATE}

- Add **Find Tenant ID** command to look up the Microsoft Entra (Azure AD) tenant ID for a domain, email address, or URL.
