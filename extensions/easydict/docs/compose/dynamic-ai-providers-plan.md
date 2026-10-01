# Dynamic AI Providers Implementation Plan

> **Executor instructions**: Implement this plan in order. Keep every phase
> independently buildable and reviewable. If a defect is found in a phase
> before the branch is published, fix it with a fixup commit and rebase it into
> the phase commit instead of adding a separate repair commit.

## Status

- **Priority**: P1
- **Effort**: XL
- **Risk**: HIGH
- **Category**: feature / architecture
- **Planned at**: commit `9ddb754`, 2026-07-23
- **Status**: TODO

## Objective

Replace the single global OpenAI and Gemini configurations with a dynamic AI
provider system that supports:

- Multiple independently enabled OpenAI-compatible configurations.
- Multiple Raycast AI configurations using different `AI.Model` values.
- Stable per-instance result identity, ordering, loading, cancellation, and
  display.
- A Raycast-native management UI.
- Curated provider presets and optional model discovery.
- Reuse of current provider icons plus a small, maintainable icon catalog.
- A safe, explicit migration path from the current OpenAI and Gemini
  preferences.

This is not only a settings feature. The existing query engine assumes one
runtime service per `QueryType`, so instance identity must be corrected before
dynamic configurations are introduced.

## Frozen areas

Do not modify these areas as part of this work:

- The embedded shared Caiyun credential or its rotation strategy.
- `SECURITY.md` or vulnerability-reporting instructions.
- `.github/workflows/` or any GitHub Action.
- Provider-specific parsing outside the AI providers covered by this plan.
- Dictionary and language-detection protocols.

## Architecture decisions

### Instance identity and semantic type are separate

`serviceId` identifies one runtime instance. `queryType` preserves the semantic
provider category used by coupling rules, hide rules, online actions, and
provider-specific behavior.

Two OpenAI-compatible profiles therefore share a semantic type but never share
an identity:

```ts
interface ResolvedTranslationService {
  id: string;
  label: string;
  queryType: TranslationType;
  order: number;
  icon: ProviderIconConfig;
  enabled: (query: QueryInput) => boolean;
  createProvider: () => BaseTranslateProvider;
}
```

Static services and dynamic profiles must both resolve to this descriptor.
Provider implementations continue to return provider-domain results; the query
engine attaches runtime service identity and display metadata.

Identity rules:

- Pending work is tracked by `serviceId`.
- `SET_RESULT` replaces only the result with the same `serviceId`.
- Sorting preserves every instance, including instances with the same
  `queryType`.
- Streaming and React keys use `serviceId`.
- Section titles, detail ordering, error attribution, and icons use the
  instance label and metadata.
- Coupling rules continue to match `queryType`, not `serviceId`.

### Dynamic profile model

```ts
interface AIProviderProfileBase {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  icon: ProviderIconConfig;
}

interface RaycastAIProfile extends AIProviderProfileBase {
  adapter: "raycast-ai";
  model: AI.Model;
}

interface OpenAICompatibleProfile extends AIProviderProfileBase {
  adapter: "openai-compatible";
  endpoint: string;
  model: string;
  apiKey: string;
  tokenLimitMode: "auto" | "max-tokens" | "max-completion-tokens";
}

type AIProviderProfile = RaycastAIProfile | OpenAICompatibleProfile;
```

Use a discriminated union. Do not add optional fields from one adapter to the
other, and do not create a generic protocol configuration DSL.

### Storage

Store profiles in Raycast `LocalStorage`, which is extension-scoped and backed
by Raycast's local encrypted database. Do not store API keys in `Cache`,
`useCachedState`, logs, test snapshots, or exported diagnostics.

`LocalStorage` accepts scalar values, so store one versioned JSON string:

```ts
interface StoredAIProviderStateV1 {
  version: 1;
  profiles: AIProviderProfile[];
  migration?: {
    legacyPreferencesImported: boolean;
  };
}
```

Parse persisted JSON as `unknown` and narrow it with runtime validators. An
unknown schema version or invalid profile must be surfaced in the management UI
without silently replacing the user's data.

The repository is the single persistence boundary. It owns `LocalStorage`
access, JSON parsing, runtime validation, migration, and canonical writes. Its
load result must distinguish missing, ready, invalid, unsupported-version, and
I/O-error states. A migration may replace the stored value only after the
complete value has been validated successfully; invalid or unsupported raw
data must remain recoverable.

UI components and the query engine must not independently parse or rewrite
storage. Do not use `useLocalStorage<T>` as the schema boundary: it parses JSON
without runtime validation, does not expose revalidation or complete read-error
state, and does not synchronize independent hook instances. Do not copy
profiles or credentials into `useCachedState` or `Cache` to obtain
subscriptions.

### Asynchronous loading

The current static registry is available synchronously, while `LocalStorage` is
asynchronous. Expose the repository through one Search Word-owned
`useAIProviderProfiles` controller, for example by building it on
`usePromise(repository.load)`. The controller exposes a discriminated
`loading | ready | invalid | unsupported | error` state, mutations, and
`revalidate`.

Do not construct the combined static/dynamic resolved-service snapshot or start
a query until the controller is ready. Preserve only the latest non-empty input
received while loading and start it once after readiness. A failed, invalid, or
unsupported load must be visible; it must not silently run only the static
providers as if no dynamic profiles existed.

The pushed management page edits through the parent controller's mutations so
Search Word receives an immediate state update. Also revalidate unconditionally
with `Action.Push.onPop` or `push(component, onPop)` when the parent becomes
active again. The shared mutation prevents a stale interval before returning;
the `onPop` revalidation confirms authoritative storage and protects against
future write paths. Do not assume either `LocalStorage` subscriptions or a
documented parent-view mounting lifetime.

When revalidation changes the resolved-service snapshot, cancel the active
query generation and rerun the current query with the new snapshot. Never mix
results produced by different service snapshots.

### Provider construction

Replace the registry's required `preference` plus zero-argument provider class
contract with resolved `enabled` and `createProvider` functions.

Static services may still derive `enabled` from generated Preferences.
Dynamic services derive it from the stored profile. Dynamic provider
constructors receive an immutable configuration snapshot.

### Translation prompt

Raycast AI accepts a single prompt while OpenAI-compatible APIs use chat
messages. Extract only the protocol-neutral translation instructions and
examples that genuinely benefit both adapters. Each adapter remains
responsible for rendering that content into its own request shape.

Represent the shared content as a protocol-neutral prompt specification rather
than a pre-rendered string or an OpenAI message array. The OpenAI-compatible
adapter must preserve native role separation: stable translation rules belong
in the system message, examples use user/assistant turns, and the source text
is the final user message. The Raycast AI adapter serializes the same
specification into one clearly delimited text prompt.

Treat source text as untrusted content to translate, not as instructions.
Textual headings or XML-style delimiters improve clarity for single-prompt
APIs, but are not a replacement for native role hierarchy where the protocol
supports it.

Do not keep the current adversarial few-shot example merely because it already
exists. Compare concise zero-shot and one-shot variants against representative
providers using ordinary text, instruction-like source text, multiline input,
Markdown or HTML, quotations, code, and proper nouns. Retain the example only
if it produces a material reliability improvement; otherwise remove it to
reduce prompt size and model-specific bias.

Do not make Raycast AI depend on OpenAI protocol types.

## Raycast AI behavior

Each Raycast AI profile selects one `AI.Model`, so users may compare multiple
models in one lookup.

The first Raycast AI phase should use `await AI.ask()` as a non-streaming
provider. `AI.ask()` returns a Promise with `data` events, not an
`AsyncIterable`; streaming requires a deliberate event-to-async-generator
bridge and must be added separately.

Required behavior:

- Check `environment.canAccess(AI)` before calling the API.
- Pass the active query's `AbortSignal`.
- Treat cancellation as normal control flow and never show a failure toast.
- Persist the raw `AI.Model` value and validate it when loading.
- Preserve unknown model values as an invalid editable state instead of
  silently changing the profile.
- Explain that Raycast may fall back to a similar model if the requested model
  is unavailable or disabled.

Raycast limits extension AI requests to 10 per minute and 100 per hour. Multiple
profiles remain allowed, but:

- New configurations default to disabled.
- The management UI warns when more than one Raycast AI profile is enabled.
- The Search command continues to debounce input before starting providers.
- Do not automatically retry rate-limit failures.

## OpenAI-compatible behavior

One configured provider implementation receives endpoint, model, API key, and
token-limit mode through its constructor. It must not read the legacy global
OpenAI or Gemini values from `ProviderConfig`.

Preserve the existing streaming, cancellation, prompt behavior, request timing,
and base-class error normalization.

Token-limit behavior:

- `auto`: preserve the current official-endpoint and reasoning-model heuristic.
- `max-tokens`: always send `max_tokens`.
- `max-completion-tokens`: always send `max_completion_tokens`.

Endpoint normalization must have one documented meaning: the stored endpoint is
the OpenAI-compatible API base URL. Historical `/chat/completions` suffixes are
removed during legacy conversion.

## Management UI

Implement a Raycast-native page that can be pushed from the Search Word action
panel. A separate root command may be added after the in-command workflow is
stable and useful.

Required actions:

- Add a Raycast AI profile.
- Add an OpenAI-compatible profile.
- Add from a curated preset.
- Edit.
- Enable or disable.
- Duplicate.
- Move up or down.
- Delete with confirmation.
- Convert an existing legacy OpenAI or Gemini configuration.

Use `Form.PasswordField` for API keys. Never reveal a key in list accessories,
subtitles, logs, error messages, or copied profile metadata.

The List should show:

- Provider icon.
- User-defined profile name.
- Adapter and model as subtitle/accessories.
- Enabled state.
- An invalid-configuration indicator when stored data can be loaded but cannot
  run.

## Icons

### No tint

Do not implement tint or user-defined icon colors. Brand assets keep their
original colors. Initials use the colors produced by `getAvatarIcon`.

```ts
type ProviderIconConfig =
  | { kind: "preset"; name: ProviderIconName }
  | { kind: "remote"; url: string }
  | { kind: "favicon"; website?: string }
  | { kind: "initials" };
```

### Existing assets

Reuse current assets through a typed preset registry; do not duplicate or
rename them during the first phase:

| Preset key | Existing asset |
|---|---|
| `openai` | `OpenAI Translate.png` |
| `gemini` | `Gemini Translate.png` |
| `google` | `Google Translate.png` |
| `apple` | `Apple Translate.png` |
| `bing` | `Bing Translate.png` |
| `deepl` | `DeepL Translate.png` |
| `deeplx` | `DeepLX Translate.png` |
| `baidu` | `Baidu Translate.png` |
| `tencent` | `Tencent Translate.png` |
| `volcano` | `Volcano Translate.png` |
| `caiyun` | `Caiyun Translate.png` |
| `youdao` | `Youdao Translate.png` |

The existing dictionary assets remain available to static dictionary services
through the same resolver.

Use Raycast's built-in `Icon.RaycastLogoPos` or `Icon.RaycastLogoNeg` for a
generic Raycast AI profile; no Raycast asset is required.

### Required new assets

The initial OpenAI-compatible preset catalog requires:

- `deepseek.svg`
- `openrouter.svg`
- `siliconflow.svg`
- `zhipu.svg`
- `kimi.svg`
- `minimax.svg`
- `mimo.svg`

Optional model-family icons for Raycast AI may be added later:

- Anthropic/Claude
- Perplexity
- Mistral
- Meta/Llama
- Qwen
- xAI/Grok

New assets belong under `assets/provider-icons/`. Prefer transparent,
self-contained SVG with a square `viewBox`. SVG must not contain scripts,
animation, or external resources. Do not copy CC Switch's icon catalog; source
assets from official brand resources or another clearly licensed source and
retain provenance.

### Resolution

The resolver follows this order:

1. A known bundled preset asset.
2. A user-supplied HTTPS image URL.
3. `getFavicon(profile.website ?? profile.endpoint)`.
4. `getAvatarIcon(profile.name)`.

Keep this in one pure resolver shared by static services, dynamic profiles, the
management UI, and Search Word.

## Presets

Start with a small catalog:

- OpenAI
- Gemini OpenAI-compatible API
- DeepSeek
- OpenRouter
- SiliconFlow
- Zhipu GLM
- Kimi
- MiniMax
- Xiaomi MiMo

A preset is a form template, not a live configuration. Selecting it fills
name, endpoint, default model, website, and icon. Saving materializes an
independent profile; future preset changes never silently modify saved user
profiles.

Verify endpoints and default models against each provider's official
documentation when implementing the preset. Do not import CC Switch's sponsored
or relay-provider catalog wholesale.

## Model discovery

Model discovery is optional and explicitly initiated by the user.

For OpenAI-compatible profiles:

1. Require a syntactically valid endpoint and a non-empty API key.
2. Resolve `models` relative to the normalized API base URL. Do not blindly
   append another `/v1`.
3. Send the standard bearer token.
4. Parse the response as `unknown`.
5. Accept only entries containing a non-empty string `id`.
6. Present a searchable model list.
7. Always retain manual model entry.

Distinguish authentication, unsupported endpoint, network, and response-shape
failures. A failed model fetch must not prevent the profile from being saved.

Only model IDs and an endpoint hash may be cached. Never put an API key or an
endpoint containing credentials into `Cache`.

Raycast AI does not use remote discovery. Build its model list from the current
`AI.Model` enum, deduplicate aliases by enum value, and validate persisted
values.

Do not add configurable model paths, authentication strategies, custom headers,
or endpoint failover until a real supported provider requires them.

## Legacy compatibility and migration

Do not remove the existing OpenAI and Gemini manifest preferences in the first
release of this feature. Users may skip extension versions, and removing the
fields would make their old secrets unavailable to later migration code.

Compatibility behavior:

- Resolve configured legacy OpenAI and Gemini preferences as fixed legacy
  services until converted.
- Give them deterministic IDs so they cannot duplicate themselves.
- Offer an explicit Convert/Import action in the management UI.
- Conversion is idempotent and records a migration marker.
- Do not run both a legacy service and its converted profile.
- Preserve enabled state and model.
- Normalize an OpenAI endpoint by removing a historical
  `/chat/completions` suffix.
- Convert the legacy Gemini root endpoint to its OpenAI-compatible
  `/v1beta/openai` base.

Removing the old preferences is a separate future decision after the migration
has existed across multiple releases.

## Implementation phases

### Phase A: Runtime service identity

Introduce `ResolvedTranslationService` and convert every existing static
translation service to a fixed stable ID and factory without changing behavior.

Update all identity-sensitive paths:

- Pending query records.
- Reducer start, finish, and result replacement.
- Stable sorting without sparse-array slot replacement.
- Stream debouncing.
- Display sections and translation detail aggregation.
- Section and item React keys.
- Section titles and markdown headings.
- Icon resolution.
- Error attribution.
- ActionPanel service lookup.

Keep coupling and hide rules semantic and based on `queryType`.

Tests must prove that two services with the same `queryType`:

- Are both pending.
- Finish independently.
- Keep both results.
- Sort deterministically.
- Produce distinct details and keys.

Recommended commit:
`refactor(query): identify runtime service instances`

### Phase B: Storage and loading boundary

Add the versioned schema, validators, repository, Search Word-owned controller,
and resolved-service loader. Model repository loading as explicit success and
failure states. Gate initial querying until the controller is ready, preserve
the latest input during loading, and add explicit `onPop` revalidation.

Test valid, invalid, unknown-version, and empty storage. Tests must not include
real API keys. Test that startup never produces a static-only service snapshot
while profiles are still loading.

Recommended commit:
`refactor(ai): add dynamic provider storage boundary`

### Phase C: Dynamic OpenAI-compatible MVP

Add the configured provider constructor and resolve stored profiles into runtime
services. Start with OpenAI, Gemini, and one non-official preset. Keep model
entry manual and use only bundled asset/favicon/initials icon resolution.

Legacy services remain operational.

Recommended commit:
`feat(ai): support OpenAI-compatible profiles`

### Phase D: Management UI

Add the List/Form workflow and Search Word `Action.Push` entry. Implement CRUD,
enable/disable, duplicate, ordering, confirmation, validation, shared
controller mutations, and unconditional `onPop` revalidation. If a changed
profile set produces a new service snapshot, cancel the active generation and
rerun the current query.

Do not add a separate root command until this workflow has been manually
validated.

Recommended commit:
`feat(ai): manage provider profiles`

### Phase E: Raycast AI non-streaming MVP

Add dynamic Raycast AI profiles using non-streaming `AI.ask()`. Implement
permission checks, cancellation, model validation, fallback messaging, and the
multi-profile rate-limit warning.

Recommended commit:
`feat(ai): add Raycast AI profiles`

### Phase F: Raycast AI streaming

Implement an event-to-async-generator bridge in the Raycast AI provider. Prove
that data events, Promise completion, errors, and aborts settle the generator
exactly once. Keep stale-generation protection in the engine.

Recommended commit:
`feat(ai): stream Raycast AI translations`

### Phase G: Model discovery

Add best-effort OpenAI-compatible model discovery, searchable selection,
non-sensitive caching, and manual fallback. Add the deduplicated Raycast model
catalog.

Recommended commit:
`feat(ai): discover available provider models`

### Phase H: Complete presets, icons, and conversion

Add the remaining verified presets and seven required SVG assets. Add optional
remote icon selection. Implement explicit, idempotent conversion of legacy
OpenAI and Gemini preferences.

Recommended commit:
`feat(ai): add provider presets and legacy import`

## Verification

Run after every phase:

```bash
npm test
npx tsc --noEmit
npm run fix-lint
npm run build
```

Focused automated coverage should remain behavior-driven:

- Same-type instance identity and independent pending state.
- Stable ordering and detail selection.
- Streaming instance isolation.
- Profile validation and storage versioning.
- Startup loading gate and management-page revalidation.
- Legacy conversion idempotency.
- Endpoint normalization and model response parsing.
- Raycast AI completion, error, abort, and rate-limit behavior.

Do not add tests that only mirror implementation details, framework rendering,
or static preset literals.

## Manual test matrix

1. Enable two OpenAI-compatible profiles with the same model and confirm both
   sections remain visible.
2. Enable two Raycast AI profiles with different models and confirm labels,
   icons, results, loading, and errors remain distinct.
3. Type consecutive queries rapidly and confirm old streams neither replace nor
   select items in the new query.
4. Abort a Raycast AI and OpenAI-compatible request and confirm no failure toast
   appears.
5. Add, edit, duplicate, reorder, disable, and delete profiles from Search Word;
   return and confirm the next query uses the new configuration.
6. Exercise bundled, remote, favicon, and initials icon resolution.
7. Fetch models from a supported endpoint, an endpoint without `/models`, an
   invalid key, and a malformed response.
8. Run with no Raycast AI access and confirm other providers remain unaffected.
9. Convert legacy OpenAI and Gemini preferences twice and confirm no duplicate
   profile or duplicate result appears.
10. Restart Raycast and confirm profiles, ordering, enabled state, and selected
    models persist.

## Done criteria

- Multiple instances of one adapter coexist without state or display collision.
- Static translation and dictionary providers retain their current behavior.
- Raycast AI and OpenAI-compatible profiles are manageable without editing the
  manifest.
- Secrets remain confined to generated Preferences or encrypted
  `LocalStorage`.
- Presets never overwrite saved profiles.
- Model discovery is optional and manual entry always works.
- All new icons render without tint and have a documented fallback.
- Existing users can continue using legacy OpenAI and Gemini configuration.
- Tests, typecheck, lint, build, and the manual matrix pass.

## STOP conditions

Stop and request a revised plan if:

- Raycast Store review guidance forbids dynamic API-key storage or this
  management workflow.
- Supporting a planned preset requires a non-OpenAI protocol or custom proxy.
- `AI.ask()` cancellation or event behavior differs from the installed Raycast
  API contract.
- Legacy preference values become unavailable before conversion can run.
- Dynamic loading cannot be gated without changing Search Word's externally
  visible query behavior.
- Required brand assets do not have a usable license or official source.

## References

- [Raycast AI API](https://developers.raycast.com/api-reference/ai)
- [Raycast LocalStorage](https://developers.raycast.com/api-reference/storage)
- [CC Switch provider editing](https://github.com/farion1231/cc-switch/blob/main/docs/user-manual/en/2-providers/2.3-edit.md)
- [CC Switch ProviderIcon](https://github.com/farion1231/cc-switch/blob/main/src/components/ProviderIcon.tsx)
- [CC Switch IconPicker](https://github.com/farion1231/cc-switch/blob/main/src/components/IconPicker.tsx)
