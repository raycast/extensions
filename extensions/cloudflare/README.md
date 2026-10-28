# Cloudflare

Manage Cloudflare zones, traffic analytics, SSL certificates, settings, DNS records, cache, Pages projects, Workers, members, and audit activity directly from Raycast.

## Commands

- **View Sites** — Browse zones, DNS records, and site details.
- **View Zone Analytics** — Review requests, bandwidth, cache ratios, visitors, page views, and threats over 24 hours, 7 days, or 30 days.
- **View Zone Settings** — Inspect SSL/TLS, HTTPS, HTTP, security, performance, cache, and development-mode settings.
- **View SSL Certificates** — Check certificate-pack status, expiry, covered hosts, issuers, and validation errors.
- **Search DNS Records** — Search and edit records across all accessible zones.
- **Quick Create DNS Record** — Create a record in any accessible zone from one form.
- **DNS Toolkit** — Check DNS health, manage DNSSEC, import/export BIND zone files, and apply bulk record changes.
- **Purge Cache** — Purge URLs, hostnames, tags, prefixes, or an entire zone.
- **View Pages** — Browse Pages projects, deployments, domains, and build logs.
- **View Deployments** — See recent Pages and Workers deployments together.
- **View Workers** — Browse Workers with deployment and version history.
- **View Worker Routes** — See which route patterns invoke each Worker and identify disabled routes.
- **View Members** — Review account members and roles.
- **View Audit Logs** — Inspect account activity from the last seven days.

## Raycast AI

Mention `@cloudflare` in Raycast AI to inspect or manage Cloudflare using natural language. The AI resolves account, zone, record, project, and Worker identifiers before performing an operation.

### Available AI tools

| Tool                      | What it does                                                                           | Access                   |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------ |
| List Zones                | Lists accessible accounts, zones, status, and nameservers                              | Read                     |
| Find DNS Records          | Searches record names, values, and types across one or every zone                      | Read                     |
| Check DNS Health          | Checks DNSSEC, SPF, DMARC, duplicates, CNAME conflicts, and exposed origins            | Read                     |
| Get DNSSEC Status         | Returns current status, DS record, key, and registrar details                          | Read                     |
| Get Zone Analytics        | Returns traffic, bandwidth, cache, visitor, page-view, and threat metrics              | Read                     |
| Get Zone Settings         | Returns key SSL/TLS, protocol, security, performance, and cache settings               | Read                     |
| List SSL Certificates     | Lists certificate packs, expiry, issuers, hosts, status, and validation errors         | Read                     |
| Create DNS Record         | Creates a supported DNS record                                                         | Confirmed write          |
| Update DNS Record         | Updates a verified record's name, value, TTL, proxy status, priority, comment, or tags | Confirmed write          |
| Delete DNS Record         | Permanently deletes a verified record                                                  | Destructive confirmation |
| Set DNSSEC Status         | Enables or disables DNSSEC and returns registrar details                               | Confirmed write          |
| Purge Zone Cache          | Purges by URL, hostname, tag, prefix, or the entire zone                               | Confirmed write          |
| List Pages Projects       | Lists Pages projects, repositories, status, and autopublish settings                   | Read                     |
| List Deployments          | Lists recent Pages and Workers deployments                                             | Read                     |
| Get Pages Deployment Logs | Returns build logs and metadata for a verified Pages deployment                        | Read                     |
| List Workers              | Lists Workers and their runtime metadata                                               | Read                     |
| List Worker Routes        | Lists route patterns and attached Worker scripts                                       | Read                     |
| Inspect Worker            | Inspects a current or specific version, handlers, exports, and binding metadata        | Read                     |
| List Account Members      | Lists account members, roles, and status                                               | Read                     |
| List Audit Logs           | Lists recent account activity without returning actor IP addresses                     | Read                     |

For example:

- `@cloudflare find the DNS records for www on example.com`
- `@cloudflare change the TTL of www.example.com to 300 seconds`
- `@cloudflare purge https://example.com/pricing from cache`
- `@cloudflare inspect the newest version of my api Worker`
- `@cloudflare show the last 7 days of traffic and cache analytics for example.com`
- `@cloudflare check whether any example.com certificates are expiring`
- `@cloudflare which Worker handles example.com/api/*?`
- `@cloudflare show the five most recent audit-log events`

### AI safety

Record creation, updates, deletion, DNSSEC changes, and cache purges always show a confirmation before Cloudflare is changed. Record updates and deletion also verify the current zone, record ID, and record name to guard against stale AI context. Whole-zone purges, record deletion, and disabling DNSSEC use destructive confirmations.

Worker inspection returns binding names, types, and resource identifiers, but never secret values. Audit-log results intentionally omit actor IP addresses.

DNS health findings are heuristic recommendations. Review whether a domain serves web or email traffic before acting on missing-record or unproxied-origin suggestions.

## Configuration

### OAuth

Run any command and choose **Connect** to sign in to Cloudflare. The extension uses the Authorization Code flow with PKCE, securely stores the resulting credentials, and automatically refreshes access tokens.

### API token fallback

Existing users can continue to provide an **API token** instead of connecting through OAuth. See [Cloudflare's API token guide](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) to create a custom token.

The following permissions are required to use the full functionality of the extension:

- Account
  - Account Settings: Read
  - Cloudflare Pages: Read
  - Workers Scripts: Read
- User
  - Memberships: Read
- Zone
  - Analytics: Read
  - Zone: Read
  - Zone Settings: Read
  - DNS: Read / Write
  - Cache Purge: Purge
  - SSL and Certificates: Read
  - Workers Routes: Read

DNS Write and Cache Purge are only needed for mutation commands. Analytics, Zone Settings, SSL and Certificates, and Workers Routes are only needed for their matching read-only commands. The remaining commands continue to work without those optional capabilities.
