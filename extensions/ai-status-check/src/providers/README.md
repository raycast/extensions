# Provider Architecture

This document describes how provider data is represented, fetched, normalized, cached, and extended in code. Product behavior and source acceptance criteria are maintained separately from these implementation details.

## Layer boundaries

- `catalog/` has exactly one file per provider. A catalog file declares identity, preferences, aliases, official URLs, icon, category, and selects an adapter. Catalog files never import payload-parsing details.
- `adapters/` owns each complete status-source integration: network orchestration, deterministic payload parsing, and conversion into `ProviderSnapshot`. Every adapter exports an `*AdapterConfig` interface and a `create*Adapter` factory; parsing functions stay in the same module so their ownership is explicit and their fixture tests remain deterministic.
- `factories/provider.ts` connects catalog metadata to any adapter, normalizes the status-page URL once, and passes through adapter-specific options.
- `utils/` contains source-independent mechanics such as HTTP, RSS tokenization, HTML-to-text cleanup, runtime-value guards, incident ordering, and status normalization.
- `domain/` defines the application vocabulary shared by providers, services, and UI. Domain types are not utilities.

Provider names belong in `catalog/`; source-platform names belong in `adapters/`. A custom provider source may have its own bound adapter, such as `adapters/xai.ts`, while still reusing internal request orchestration from `adapters/page-and-feed.ts`. All catalog files use the same framework-neutral `createProvider` helper.

React components never contain provider-specific parsing or source logic.

## Contracts

All adapters return the same normalized domain model:

```ts
type Health = "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance" | "unknown";

type IncidentState = "investigating" | "identified" | "monitoring" | "resolved" | "scheduled" | "unknown";

interface ProviderSnapshot {
  providerId: string;
  health: Health;
  statusText?: string;
  components: ComponentStatus[];
  incidents: Incident[];
  fetchedAt: string;
}

interface ComponentStatus {
  id: string;
  name: string;
  group?: string;
  health: Health;
  statusText?: string;
  url?: string;
  history?: ComponentHistory;
}

interface ComponentHistory {
  windowDays: number;
  basis: "availability" | "incidents";
  days: ComponentHistoryDay[];
  uptimePercent?: number;
  uptimeText?: string;
  monitoredSince?: string;
}

interface Incident {
  id: string;
  title: string;
  health: Health;
  state: IncidentState;
  stateText?: string;
  impactText?: string;
  startedAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  affectedComponentIds: string[];
  updates: IncidentUpdate[];
  url?: string;
}
```

The provider boundary is deliberately small:

```ts
interface ProviderAdapter {
  fetch(signal: AbortSignal): Promise<ProviderSnapshot>;
  fetchComponentHistory?(componentId: string, signal: AbortSignal): Promise<ComponentHistory | undefined>;
}

interface ProviderDefinition {
  id: string;
  name: string;
  aliases: string[];
  category: ProviderCategory;
  preferenceKey: string;
  icon: string;
  statusPageUrl: string;
  adapter: ProviderAdapter;
}
```

External payloads enter adapter parsing functions as `unknown` or source text. Those deterministic functions validate the fields they understand, retain readable source wording, and map only the small internal enums required for icons, ordering, and aggregation. UI code consumes normalized records rather than source payloads.

Component history follows the same ownership rule. Adapters populate `ComponentStatus.history` during their normal source request when history is available in a shared response. A provider may instead implement `fetchComponentHistory` when the official site publishes history only on a component-specific page; the UI calls that path lazily for the selected component. Absence is represented by `undefined`, not by an all-green synthetic chart.

## Data flow

```text
official status source
  -> source-family adapter
     -> fetch source payloads
     -> parse and validate them
     -> combine normalized results
     -> attach optional source-published component history
  -> ProviderSnapshot
  -> last-successful cache
  -> ProviderStatusRecord
  -> shared provider presentation
```

`ProviderSnapshot.health` is the adapter's behavioral classification. `statusText`, component `statusText`, incident `stateText`, and `impactText` preserve readable provider language. Presentation derives canonical labels for a small allowlist at render time, so changing a UI alias does not invalidate cached snapshots.

`ProviderStatusRecord` keeps data freshness and refresh state separate from provider health:

```ts
type DataFreshness = "fresh" | "stale" | "expired" | "unavailable";
type RefreshState = "idle" | "refreshing" | "failed";

interface ProviderStatusRecord {
  providerId: string;
  snapshot?: ProviderSnapshot;
  freshness: DataFreshness;
  refreshState: RefreshState;
  refreshError?: string;
}
```

## Catalog and framework configuration

The catalog is organized by provider identity, not source vendor. The architecture test enforces exactly one exported provider definition per registered provider file.

A conventional Statuspage provider needs metadata plus its shared adapter:

```ts
export const claudeProvider = createProvider(
  {
    id: "claude",
    name: "Claude",
    aliases: ["Anthropic", "Claude API", "Claude Code"],
    category: "model-providers",
    preferenceKey: "showClaude",
    icon: "provider-icons/claude.png",
    statusPageUrl: "https://status.claude.com/",
  },
  createStatuspageAdapter,
);
```

`createProvider` supplies the provider ID and normalized status-page URL to the adapter. Required framework options are type-checked, so adding a Flashcat provider requires a `pageId`, while conventional Statuspage and Incident.io providers need no additional options.

Framework adapters own their conventional routes. Statuspage derives its summary, incident, and maintenance API routes. Incident.io derives its same-origin `proxy/<status-page-host>` and `proxy/<status-page-host>/incidents` routes. Those are the same endpoints used by the rendered pages.

Special cases remain owned by adapter modules rather than catalog branches. Statuspage and Incident.io accept narrow endpoint or filtering options. Mistral, OpenRouter, and xAI expose bound adapter factories that select their page parser internally while reusing the page-and-feed request flow. For example:

```ts
export function createXaiAdapter(config: XaiAdapterConfig): ProviderAdapter {
  return createPageAndFeedAdapter({
    ...config,
    pageUrl: "https://status.x.ai/index.txt",
    feedUrl: "https://status.x.ai/feed.xml",
    parsePage: parseXaiStatusPage,
  });
}
```

Keep shared fetching, merging, sorting, health handling, and snapshot construction in reusable adapter functions, while each public adapter module owns the source-specific parser it selects.

The provider-facing catalog name remains stable if its status vendor changes.

## Implemented source families

| Providers                                                               | Implementation                | Data used                                                                                                                                    |
| ----------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI, Cohere, Groq, Replicate, ElevenLabs, Fireworks AI, Stability AI | Incident.io adapter           | Same-origin proxy summary, incident history, component impacts, exact uptime where enabled, and source monitoring dates                      |
| Claude, Cerebras, Baseten                                               | Statuspage-compatible adapter | Published summary, components, incidents, scheduled maintenance, and rendered `uptimeData`                                                   |
| Together AI, Hugging Face                                               | Better Stack adapter          | `index.json` sections, resources, reports, updates, status history, and availability                                                         |
| Perplexity                                                              | Instatus adapter              | Official `/v3/summary.json`, `/v3/components.json`, `/history.rss`, and rendered component uptime data                                       |
| DeepSeek                                                                | Flashcat adapter              | Components, active changes, incident history, component impacts, and component uptimes from the published page ID                            |
| Mistral AI, OpenRouter                                                  | Bound provider adapters       | Provider-specific rendered-page parsing, component history and exact published uptime, plus shared incident/update history from RSS          |
| xAI                                                                     | xAI adapter                   | All current services from the page's Next.js RSC response, lazy component-page incident history, and shared incident/update history from RSS |
| Google AI Studio and Gemini                                             | Gemini adapter                | The public status RPC, its rendered-page component labels, and 90-day incident-derived component history                                     |

The catalog always retains the canonical official status page for user verification, even when the structured endpoint is hosted by the provider's status vendor.

## Component history

History is optional at the normalized boundary because some official pages publish only current operational state, and some publish history for only a subset of components. Rendering follows three rules:

1. Reproduce the provider's published availability or incident calendar when the source exposes enough data.
2. Show `uptimePercent` only when the source publishes it or exposes exact duration data from which it can be calculated. Preserve provider-displayed precision in `uptimeText`; an incident-day chart alone is not treated as an uptime measurement.
3. Preserve monitoring gaps as `not_monitored`; do not render pre-monitoring dates as successful uptime.

The shared renderer does not inspect provider IDs. It renders any normalized `ComponentHistory`, so partial support is handled uniformly: a component with history gets a chart, while a component without it gets current status and a clear no-history message.

The Gemini RPC uses undocumented numeric enums. The parsing functions in `adapters/gemini.ts` map only values verified against the official page's rendered lifecycle labels and severity classes, preserve those labels as source text, and leave any new value unknown rather than applying a numeric range fallback.

## Component groups

The normalized model supports one optional group name per component. The UI builds its one-level hierarchy from this field.

For Incident.io pages, `adapters/incidentio.ts` reads the source-published `structure` directly from the proxy JSON. Group entries become the shared model's one-level component groups; standalone entries remain ungrouped. Components absent from `affected_components` are operational, matching Incident.io's published current-status model. If a proxy response omits `structure`, the adapter keeps its published component catalog flat.

Other adapters populate `group` only when their official source publishes group information. Catalog files do not invent groups.

## Health and source wording

Adapters retain two separate values:

- A normalized `Health` or `IncidentState` for icons, ordering, grouping, and fallback aggregation.
- The source's readable wording for display.

Unknown source strings map to `unknown` for behavioral classification rather than silently becoming operational. Their readable text remains available unchanged.

`domain/status-presentation.ts` recognizes a deliberately small alias allowlist. Known operational aliases render consistently; unfamiliar wording is trimmed and preserved. Final presentation is computed at render time rather than stored in the cache.

`deriveProviderHealth` follows these rules:

1. A usable provider-published overall health is authoritative.
2. When no overall health is available, use the highest known active-incident or component severity.
3. Ignore `unknown` while known signals exist.
4. Treat scheduled incidents as maintenance.
5. Do not infer incident impact from lifecycle state.

Severity ordering is:

```text
major_outage > partial_outage > degraded > maintenance > operational
```

Scoped platform providers intentionally discard the platform-wide overall state and derive health only from their selected components and incidents.

## Fetching and cache implementation

`services/fetch-provider-statuses.ts` owns request policy:

- Read cached snapshots before scheduling requests.
- Skip automatic requests for snapshots no more than 60 seconds old.
- Retain snapshots for up to 24 hours while revalidating.
- Run at most six provider requests concurrently.
- Apply an eight-second timeout per provider.
- Isolate failures per provider.
- Preserve the previous successful snapshot on failure.
- Let forced provider or global refresh bypass the freshness shortcut.

`services/status-cache.ts` stores versioned, per-provider JSON snapshots through Raycast `Cache`. It performs lightweight runtime validation before returning cached values.

`hooks/use-provider-statuses.ts` coordinates the current provider set, aborts superseded bulk refresh generations, commits bulk refresh results together, and exposes a single list-level loading state. Per-provider request tokens cover bulk, individual, and duplicate refreshes, so a late older response can update neither React state nor the persistent cache.

## Adding a provider

1. Confirm that the official source meets the product acceptance requirements.
2. Add one `catalog/<provider>.ts` file.
3. Reuse a source-family adapter through `createProvider` whenever possible.
4. Add the provider to `registry.ts` in its display order.
5. Add its manifest checkbox preference in matching category order.
6. Add a bundled icon under `assets/provider-icons/`.
7. Add or extend deterministic adapter fixture tests, including malformed payloads.
8. Run tests, type-checking, Raycast lint/build, and the opt-in live source check.

Add a new adapter only when no existing source family fits. Adding a provider must not require UI, cache, grouping, action, or section-order changes.

## Source layout

```text
src/
  domain/
    derive-health.ts
    freshness.ts
    provider-view.ts
    status-presentation.ts
    types.ts
  providers/
    README.md
    registry.ts
    provider-sections.ts
    types.ts
    catalog/
      <provider>.ts
    adapters/
      betterstack.ts
      flashcat.ts
      gemini.ts
      incidentio.ts
      instatus.ts
      mistral.ts
      openrouter.ts
      page-and-feed.ts
      statuspage.ts
      xai.ts
    factories/
      provider.ts
    utils/
      http.ts
      incidents.ts
      rss.ts
      runtime-values.ts
      status-normalization.ts
  services/
    fetch-provider-statuses.ts
    status-cache.ts
  hooks/
    use-provider-statuses.ts
```

## Project conventions and verification

- Use npm and retain `package-lock.json` for Raycast Store consistency.
- Keep provider icons local and require every `ProviderDefinition` to reference one.
- Prefer platform `fetch`, `Intl`, and narrow runtime guards over additional runtime dependencies.
- Keep deterministic tests network-independent.
- Cover source parsing, malformed input, health mapping, incident histories, grouping, caching, registry order, preferences, and icons.
- Use `npm run check:sources` as an opt-in compatibility check against current official sources.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` before release.
