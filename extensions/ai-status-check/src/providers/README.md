# Provider Architecture

This document describes how provider data is represented, fetched, normalized, cached, and extended in code. Product behavior and source acceptance criteria are maintained separately from these implementation details.

## Layer boundaries

- `catalog/` has exactly one file per provider. A catalog file declares identity, preferences, aliases, official URLs, icon, category, and adapter configuration. Catalog files are never grouped by backend platform.
- `adapters/` owns network orchestration for one status-source family and converts source responses into `ProviderSnapshot`. Every adapter exports an `*AdapterConfig` interface and a `create*Adapter` factory.
- `factories/provider.ts` connects catalog metadata to any adapter, normalizes the status-page URL once, and passes through adapter-specific options.
- `parsers/` performs deterministic source-format parsing without network requests.
- `utils/` contains low-level HTTP, runtime-value, incident-ordering, and source-status helpers.
- `domain/` defines the application vocabulary shared by providers, services, and UI. Domain types are not utilities.

Provider names belong in `catalog/`; source-platform names belong in `adapters/` and `parsers/`. For example, `catalog/deepseek.ts` uses `adapters/flashcat.ts`. All catalog files use the same framework-neutral `createProvider` helper.

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

External payloads enter parsers as `unknown`. Parsers validate the fields they understand, retain readable source wording, and map only the small internal enums required for icons, ordering, and aggregation. UI code consumes normalized records rather than source payloads.

## Data flow

```text
official status source
  -> source-family adapter
  -> parser and runtime validation
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

Special cases remain configuration rather than provider-name branches. Statuspage and Incident.io accept endpoint and parser overrides; Statuspage also accepts component and incident filters. Rendered-page/RSS providers supply a deterministic page parser and may override their feed parser. For example:

```ts
export const variantProvider = createProvider(metadata, createIncidentIoAdapter, {
  proxyUrl: "https://status.example.com/custom/current",
  incidentsUrl: "https://status.example.com/custom/history",
  parseSummary: parseVariantSummary,
});
```

Use the smallest override possible. Keep shared fetching, merging, sorting, health handling, and snapshot construction in the framework adapter.

The provider-facing catalog name remains stable if its status vendor changes.

## Implemented source families

| Providers                                                               | Implementation                | Data used                                                                                                               |
| ----------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| OpenAI, Cohere, Groq, Replicate, ElevenLabs, Fireworks AI, Stability AI | Incident.io adapter           | Same-origin proxy summary and incident-history responses used by the rendered pages                                     |
| Claude, Cerebras, Baseten                                               | Statuspage-compatible adapter | Published summary, components, incidents, and scheduled maintenance                                                     |
| Together AI, Hugging Face                                               | Better Stack adapter          | `index.json` sections, resources, reports, and updates                                                                  |
| Perplexity                                                              | Instatus adapter              | Official `/v3/summary.json`, `/v3/components.json`, and `/history.rss` responses                                        |
| DeepSeek                                                                | Flashcat adapter              | Components, active changes, and incident history from the published page ID                                             |
| Mistral AI, OpenRouter                                                  | Rendered-page and RSS adapter | Current components from the page and incident/update history from RSS                                                   |
| xAI                                                                     | Rendered-page and RSS adapter | All current services from the page's Next.js RSC response plus incident/update history from RSS; no groups are invented |
| Google AI Studio and Gemini                                             | Gemini adapter                | The public status RPC and its rendered-page component labels                                                            |

The catalog always retains the canonical official status page for user verification, even when the structured endpoint is hosted by the provider's status vendor.

The Gemini RPC uses undocumented numeric enums. Its parser maps only values verified against the official page's rendered lifecycle labels and severity classes, preserves those labels as source text, and leaves any new value unknown rather than applying a numeric range fallback.

## Component groups

The normalized model supports one optional group name per component. The UI builds its one-level hierarchy from this field.

For Incident.io pages, `parsers/incidentio.ts` reads the source-published `structure` directly from the proxy JSON. Group entries become the shared model's one-level component groups; standalone entries remain ungrouped. Components absent from `affected_components` are operational, matching Incident.io's published current-status model. If a proxy response omits `structure`, the parser keeps its published component catalog flat.

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
7. Add or extend deterministic parser and adapter fixtures.
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
      html-rss.ts
      incidentio.ts
      instatus.ts
      statuspage.ts
    factories/
      provider.ts
    parsers/
      betterstack.ts
      gemini.ts
      incident-rss.ts
      incidentio.ts
      instatus.ts
      rendered-status.ts
      rss.ts
      statuspage.ts
      xai.ts
    utils/
      http.ts
      incidents.ts
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
