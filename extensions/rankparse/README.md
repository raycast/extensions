# RankParse

Look up backlinks, domain authority, tech stack, and SEO/site audits from [RankParse](https://rankparse.com) without leaving Raycast.

## Setup

1. Get an API key at [rankparse.com/dashboard](https://rankparse.com/dashboard). New accounts start with a small free credit balance, so you can try the extension before buying more credits.
2. On first launch, Raycast will prompt you for the **RankParse API Key** preference — paste your key (starts with `rp_`).

## About the RankParse API

RankParse is a **paid, credit-metered API** — every lookup deducts credits from your account balance, shown as "N credits" in results and in the **RankParse Account** menu bar command. Approximate costs:

| Command | Typical cost per lookup |
| --- | --- |
| Search Backlinks | 2 credits |
| Domain Snapshot | 1-2 credits (Link Audit and Site Explorer actions cost 8 and 10 credits respectively — always confirmed before you run them) |
| Cross-Domain Compare | 5 credits |
| Page & Site Audit | 2-3 credits |
| RankParse Account | Free |
| Batch Backlinks Lookup | 2 credits per successfully queried domain, up to 50 domains |

Top up credits any time from the **RankParse Account** menu bar item, or at [rankparse.com/dashboard](https://rankparse.com/dashboard).

## Commands

- **Search Backlinks** — browse backlinks, referring domains, outbound links, anchor text, and top pages for a domain.
- **Domain Snapshot** — domain authority, domain rank, and crawl history at a glance, with optional deep-dive actions for a full link audit or site explorer.
- **Cross-Domain Compare** — domain overlap, link intersect, competitor gap, and similar domains.
- **Page & Site Audit** — page SEO, page performance (Core Web Vitals), tech stack, site health, and sitemap.
- **RankParse Account** — menu bar credit balance and recent usage.
- **Batch Backlinks Lookup** — backlinks for up to 50 domains at once (2 credits per successfully queried domain).

## Not yet available

A few RankParse API endpoints (`link-velocity`, `new-links`, `lost-links`, `schema-markup`, `internal-links`) are still stubs on the RankParse side as of this release and always return "not yet available" — they're intentionally left out of this extension's UI until the API supports them.

Creating/revoking API keys and buying credit packs are managed from the [RankParse dashboard](https://rankparse.com/dashboard), not from this extension.
