# Is It Alive? Changelog

## [Suggested Sites, OnlineOrNot, and FireHydrant] - 2026-08-29

- Add OnlineOrNot status pages through the public summary API. Look up hosted pages by subdomain and custom domains such as status.openrouter.ai by hostname
- Add FireHydrant status pages (e.g. status.redis.io) via `/data/payload.json`
- Follow incident.io status-page redirects so URLs like status.linear.app resolve to the canonical proxy JSON API
- Add Developer Tools, Data, and Auth & Payments sections to the suggested sites list, along with more infrastructure and AI status pages
- Fetch two status pages at a time and store compact list snapshots to stay under Raycast's memory limit. Fetch full history only in the detail view

## [OutageDeck Support] - 2026-08-21

- Add OutageDeck provider URLs for normalized vendor-published status, service details, and active incidents across cloud and SaaS providers

## [Statuspage Uptime Accuracy] - 2026-07-26

- Fix Statuspage 90-day uptime drift (e.g. claude.ai showing ~59% vs the site's ~99.4%) by using Statuspage's embedded per-second outage data instead of counting any incident day as full downtime

## [Restore Site Creation Fix] - 2026-07-21

- Restore adding sites in Raycast runtimes where the Web Crypto global is unavailable

## [Google Cloud and Google AI Studio Support] - 2026-07-12

- Add support for the Google Cloud Service Health dashboard (status.cloud.google.com), including per-product monitoring via `/products/{name}` URLs (e.g. vertex-gemini-api)
- Add support for the Google AI Studio status page (aistudio.google.com/status) covering the Gemini API, Gemini Live API, and AI Studio

## [AWS Region Filtering] - 2026-07-10

- Filter AWS Health incidents and components by monitored regions when adding or editing a site
- Show region filter metadata in the site detail view

## [Instatus, Checkly, AWS, Salesforce Trust, Uptime.com, and RSS Support] - 2026-07-10

- Add support for Instatus status pages via the public `/summary.json` API, including per-component uptime and 90-day history
- Add support for Checkly status pages (e.g. status.mistral.ai) with per-service uptime and 90-day history
- Add support for the AWS Health Dashboard (health.aws.amazon.com) with per-service-region events and history
- Add support for Salesforce Trust product pages (status.salesforce.com/products/…) via the public Trust API; status.heroku.com maps to the Heroku product since its own status site is deprecated
- Add support for Uptime.com status pages (hosted and custom-domain) with per-component uptime, 90-day history, and incident details
- Add a generic RSS feed fallback for status pages that block their APIs (e.g. status.x.ai)

## [Fix Site Creation] - 2026-07-10

- Fix adding sites when the Web Crypto global is unavailable

## [Initial Release] - 2026-06-11

- Monitor status pages from a single Raycast command
- Auto-detect providers: Statuspage.io, Better Stack, incident.io, and Railway
- Add, edit, and delete monitored sites with local storage persistence
- Color-coded site list with parallel fetch and incident accessories
- Detail view with overview, active incidents, and per-component status
- 90-day uptime history charts with SVG bar visualization
