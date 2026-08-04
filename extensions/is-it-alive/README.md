<p align="center">
  <img src="assets/extension-icon.png" width="128" alt="Is It Alive? icon" />
</p>

<h1 align="center">Is It Alive?</h1>

<p align="center">
  Raycast extension that monitors status pages so you can quickly answer: <strong>is the outage on my side or theirs?</strong>
</p>

<p align="center">
  Add status page URLs, get a color-coded list of services, and drill into component-level detail with uptime history — without opening a browser tab.
</p>

## Screenshots

<p align="center">
  <img src="metadata/is-it-alive-1.png" alt="Monitored sites list with live status" width="720" />
</p>

<p align="center">
  <em>Site list — parallel fetch, status subtitles, and quick access to details.</em>
</p>

<p align="center">
  <img src="metadata/is-it-alive-2.png" alt="Status detail view with 90-day uptime charts" width="720" />
</p>

<p align="center">
  <em>Detail view — component breakdown, active incidents, and 90-day uptime history.</em>
</p>

## Supported status pages

The extension auto-detects the provider when you add a URL. Detection order: **Railway → AWS → Salesforce Trust → Google Cloud → AI Studio → incident.io → Better Stack → Instatus → Statuspage → Checkly → Uptime.com → RSS**.

| Provider          | Examples                                                       | Detection                             |
| ----------------- | -------------------------------------------------------------- | ------------------------------------- |
| **Railway**       | [status.railway.com](https://status.railway.com)               | Hostname match                        |
| **AWS**           | [health.aws.amazon.com](https://health.aws.amazon.com/health/status) | Hostname match                 |
| **Salesforce Trust** | [status.salesforce.com/products/Heroku](https://status.salesforce.com/products/Heroku), [status.heroku.com](https://status.heroku.com) | Hostname match |
| **Google Cloud**  | [status.cloud.google.com](https://status.cloud.google.com), `status.cloud.google.com/products/vertex-gemini-api` | Hostname match |
| **AI Studio**     | [aistudio.google.com/status](https://aistudio.google.com/status) | Hostname match |
| **incident.io**   | [status.openai.com](https://status.openai.com)                 | `/proxy/{host}/component_impacts` API |
| **Better Stack**  | [status.yachtway.com](https://status.yachtway.com)             | `/index.json` JSON:API                |
| **Instatus**      | [instat.us](https://instat.us)                                 | `/summary.json`                       |
| **Statuspage.io** | [status.claude.com](https://status.claude.com), GitHub, Vercel | `/api/v2/summary.json`                |
| **Checkly**       | [status.mistral.ai](https://status.mistral.ai)                 | `__NUXT_DATA__` payload in page HTML  |
| **Uptime.com**    | [status.uptime.com](https://status.uptime.com), [uptime.com/statuspage/hackerrank](https://uptime.com/statuspage/hackerrank) | React props payload in page HTML |
| **RSS fallback**  | [status.x.ai](https://status.x.ai)                             | `/feed.xml` (and common feed paths)   |

incident.io is checked before Statuspage because some Statuspage hosts expose proxy-style URLs that look similar but lack incident.io-only endpoints like `component_impacts`.

Instatus must also be checked before Statuspage: Instatus pages serve a Statuspage-compatible `/api/v2/summary.json` shim, so the Statuspage detector matches them even though the payload lacks Statuspage-only fields.

Checkly has no public JSON API for status pages, so its adapter parses the Nuxt (`__NUXT_DATA__`) payload embedded in the page HTML. It is checked late because its detection requires downloading the full page.

Uptime.com status pages embed their full state as React props in the page HTML; the adapter parses that payload and also calls the page's `/history` JSON endpoint for 90-day uptime and past incidents. Like Checkly, it is checked late because detection requires downloading the page. Both hosted (`uptime.com/statuspage/{slug}`) and custom-domain pages work.

The RSS fallback is checked last and covers pages whose APIs and HTML are blocked (e.g. status.x.ai sits behind a Cloudflare challenge but keeps `/feed.xml` reachable). It is incident-only: components are derived from incident titles, day history marks incident days, and no uptime percentage is available.

The AWS adapter reads the Health Dashboard's public `currentevents` endpoint (UTF-16 JSON) plus the 12-month `historyevents.json` S3 export. Components cover service–region pairs that have reported events; services with no events in the window don't appear.

The Salesforce Trust adapter uses the public `api.status.salesforce.com/v1` API and covers any product page on [status.salesforce.com](https://status.salesforce.com) (Heroku, Tableau, Mulesoft, Slack, …). Add `https://status.salesforce.com/products/{Product}` to monitor one product; the bare domain maps to the core Salesforce Services product. `status.heroku.com` is deprecated in favor of Salesforce Trust, so it maps to the Heroku product automatically.

The Google Cloud adapter reads the Service Health dashboard's public `incidents.json` and `products.json` feeds. The dashboard has no per-product URLs, so the adapter supports a path convention: add `https://status.cloud.google.com/products/{product-name}` (e.g. `vertex-gemini-api` for the Gemini API on Vertex, or `vertex-ai` to match all Vertex AI products). The bare domain shows only products with recent incidents, since listing all ~200 as operational adds no signal.

The AI Studio adapter covers [aistudio.google.com/status](https://aistudio.google.com/status) (Gemini API, Gemini Live API, and Google AI Studio for developers using API keys rather than Vertex). The page has no REST API; the adapter calls the same protobuf-JSON RPC the page itself uses, extracting the page's public referrer-restricted API key from the HTML at runtime.

## Features

- **Site list** — parallel fetch, status subtitle, incident accessories
- **Add / edit / delete** — sites stored in Raycast local storage
- **Detail view** — overview, active incidents, per-component status
- **Uptime charts** — 90-day SVG bar history with uptime percentage

## Usage

1. Open **Is It Alive?** in Raycast
2. Add a status page URL (display name is optional — it defaults to the page title)
3. Press Enter to preview

## Development

Requires [Raycast](https://raycast.com), Node.js, and npm.

```bash
npm install
npm run dev      # run in Raycast dev mode
npm run lint     # lint + format check
npm run build    # production build
```

### Project structure

```
src/
  alive.tsx              # main list command
  adapters/
    index.ts             # provider detection + registry
    statuspage.ts        # Statuspage.io v2 API
    aws.ts               # AWS Health Dashboard public events
    betterstack.ts       # Better Stack /index.json API
    checkly.ts           # Checkly __NUXT_DATA__ HTML payload
    incident-io.ts       # incident.io proxy API
    instatus.ts          # Instatus public /summary.json API
    railway.ts           # Railway status API
    rss.ts               # generic RSS feed fallback (e.g. status.x.ai)
    aistudio.ts          # Google AI Studio / Gemini API incidents RPC
    googlecloud.ts       # Google Cloud Service Health incidents/products JSON
    salesforce.ts        # Salesforce Trust API (also covers status.heroku.com)
    uptimecom.ts         # Uptime.com React props payload + /history JSON
  components/
    site-form.tsx        # add / edit form
    site-detail.tsx      # preview with uptime charts
  hooks/use-sites.ts     # local storage CRUD
  lib/
    fetch-json.ts        # shared JSON fetch helper
    snapshot-text.ts     # uptime labels + status descriptions
    status-colors.ts     # indicator + component colors
    uptime-chart.ts      # SVG chart generation + uptime math
    url.ts               # URL normalization + Railway host check
  types/                 # shared + provider-specific API types
```

### Adding a new provider

1. Add a `SiteProvider` variant in `src/types/index.ts`
2. Add provider API types under `src/types/` if needed
3. Implement `StatusAdapter` (`detect?` + `fetchSnapshot`) in `src/adapters/`
4. Register it in `src/adapters/index.ts` and update `detectProvider`

Each adapter normalizes its API into a shared `StatusSnapshot` shape so the UI stays provider-agnostic.

## License

MIT
