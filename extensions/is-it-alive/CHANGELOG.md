# Is It Alive? Changelog

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
