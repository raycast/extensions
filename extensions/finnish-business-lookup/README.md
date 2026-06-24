# FBL - Finnish Business Lookup (Raycast Extension)

FBL helps you look up Finnish businesses in Raycast using PRH YTJ open data.

## Features

- Search by company name or Business ID
- Business ID normalization (`01120389` -> `0112038-9`)
- Safe query guards to avoid accidental full-dataset fetches
- Pagination support with `Load More Results`
- Request deduplication for identical in-flight API calls
- Persistent local search cache for faster repeated lookups
- Company details view with identity, status, classification, addresses, and active registers
- In-app `What's New` panel for quick release notes
- Quick actions: copy ID/address, open YTJ search, open raw PRH JSON, open company website, and open address in maps

## Stack

- Language: TypeScript + React (TSX)
- Runtime/tooling: Raycast API + Bun

## Requirements

- Raycast 1.26.0+
- Node.js 22.14+ (Raycast requirement)
- Bun 1.2+

## Setup

1. Install dependencies:

```bash
bun install
```

2. Start development mode:

```bash
bun run dev
```

3. Lint and build:

```bash
bun run lint
bun run build
```

## Package Manager Guidance

- Local development in this repo: **Bun** (`bun install`, `bun run ...`)
- For Raycast Store submission: Raycast currently documents **npm + `package-lock.json`** for CI/review consistency.

## Official Raycast Docs

- Getting Started: <https://developers.raycast.com/basics/getting-started>
- Create Your First Extension: <https://developers.raycast.com/basics/create-your-first-extension>
- CLI: <https://developers.raycast.com/information/developer-tools/cli>
- Templates: <https://developers.raycast.com/information/developer-tools/templates>
- ESLint: <https://developers.raycast.com/information/developer-tools/eslint>
- Security: <https://developers.raycast.com/information/security>
- Publish an Extension: <https://developers.raycast.com/basics/publish-an-extension>
- Prepare an Extension for Store: <https://developers.raycast.com/basics/prepare-an-extension-for-store>
- Manifest Reference: <https://developers.raycast.com/information/manifest>
- API Reference: <https://developers.raycast.com/api-reference>

## Documentation

- Usage: `docs/USAGE.md`
- Development: `docs/DEVELOPMENT.md`
- Store submission: `docs/STORE_SUBMISSION.md`
- Agent/contributor essentials: `AGENTS.md`

## Data Source

- PRH YTJ Open Data API v3
- Endpoint used: `GET /companies`
- Base URL: `https://avoindata.prh.fi/opendata-ytj-api/v3`

References:
- Swagger UI: <https://avoindata.prh.fi/fi/ytj/swagger-ui>
- OpenAPI schema (EN): <https://avoindata.prh.fi/opendata-ytj-api/v3/schema?lang=en>

## Limitations (MVP)

- No financial tabs
- No stable YTJ deep-link per business ID assumed; uses YTJ search page + raw PRH JSON link
- No phone/email fields in PRH YTJ v3 `/companies`

## Roadmap

- Add phone/email only if PRH or another explicitly approved source provides reliable contact fields

## Privacy

- No credentials are required
- Queries are sent to PRH public API to retrieve company records
- A short-lived search cache is stored locally to improve repeated query speed

## License / Attribution

- Company data source: PRH YTJ Open Data API v3
- Company data license: Creative Commons Attribution 4.0 International (CC BY 4.0)
- This extension is unofficial and is not affiliated with or endorsed by PRH, YTJ, the Finnish Patent and Registration Office, or the Finnish Business Information System.
- The extension icon is an independent company-search mark and does not use PRH or YTJ logos.
