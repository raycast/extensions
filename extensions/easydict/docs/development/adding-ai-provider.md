# Adding an AI Provider Preset

This guide covers adding a built-in OpenAI-compatible provider preset. A user who only needs a different OpenAI-compatible endpoint can use the existing **Custom** provider and does not need a code change. A provider that does not implement the OpenAI-compatible adapter is a larger architecture change and is outside this guide.

## 1. Research the provider API

Confirm the provider's contract before editing the extension. Record the following without assuming that an undocumented provider behaves like OpenAI:

- The API base URL used for chat completions. The runtime normalizes a base URL and appends the chat-completions path.
- Whether the provider exposes a models endpoint, how it authenticates that endpoint, and whether inference also requires an API key.
- The exact model IDs accepted by chat completions.
- Which token parameter the provider accepts: `max_tokens` or `max_completion_tokens`.
- Whether the provider supports a JSON object response format for dictionary results. If it does not, use prompt-based JSON.

The shared model-discovery code expects an OpenAI-compatible response shaped as `{ data: [{ id: string }] }`. If the provider uses another shape, do not add a provider-specific workaround to the shared path without first evaluating the adapter or normalizer boundary.

## 2. Add the preset

Add an entry to `src/ai-providers/presets.ts` with the fields defined by `OpenAICompatiblePreset`:

```ts
newProvider: {
  name: "Provider Name",
  endpoint: "https://api.example.com/v1",
  website: "https://example.com",
  model: "provider-model-id",
  icon: { kind: "initials" },
  tokenLimitMode: "max-tokens",
  jsonOutputMode: "prompt",
},
```

`name`, `endpoint`, `website`, `model`, `icon`, `tokenLimitMode`, and `jsonOutputMode` are form defaults. The preset uses the shared OpenAI-compatible adapter at runtime; do not add provider-specific request code for a standard-compatible endpoint. `tokenLimitMode` selects the corresponding token parameter. Set `jsonOutputMode` to `json-object` only when the preset's endpoint and model are documented to support it; otherwise use `prompt`. The provider form validates the name, endpoint, and model; whether model discovery or inference requires an API key depends on the provider. OpenCode Zen and OpenCode Go can load their model catalogs anonymously, but their inference requests still require the provider API key.

Providers created from a preset receive an ID-based saved-order key and appear alongside built-in services once added. A provider that explicitly replaces a legacy OpenAI or Gemini configuration occupies that legacy service's stable ordering slot instead. Do not derive keys from display labels or reorder the built-in registry casually, because saved orders and legacy replacements depend on stable keys.

The runtime normalizes the endpoint with `normalizeOpenAICompatibleEndpoint`, including a pasted trailing `/chat/completions` path, before making requests.

## 3. Choose and register an icon

For a bundled brand icon, follow the [provider icon guide](provider-icons.md). In summary, register the icon in every relevant layer:

1. Add the SVG asset under `assets/provider-icons/`.
2. Add the icon name to `PROVIDER_ICON_NAMES` in `src/ai-providers/types.ts`.
3. Map the name to the bundled asset in `providerIconAssets` in `src/components/ui/Icons.tsx`.
4. Add the same choice to the icon dropdown in `src/components/pages/AIProviderForm.tsx`.
5. Point the preset's `icon` field at the registered preset icon.

`ProviderIconConfig` also supports `{ kind: "favicon", website?: string }` and `{ kind: "initials" }` when a bundled brand asset is not appropriate. The form also supports a remote icon URL for providers, but a bundled icon or favicon is preferable for a built-in preset.

## 4. Handle model discovery deliberately

For an OpenAI-compatible provider, model discovery derives a normalized `<base>/models` URL. It removes a trailing `/chat/completions` when necessary, then requests the models endpoint with `Authorization: Bearer <key>` for the usual provider case.

Only add an endpoint to `PUBLIC_OPENAI_COMPATIBLE_MODELS_ENDPOINTS` in `src/ai-providers/modelDiscovery.ts` after confirming that its models catalog is intentionally public and supports anonymous requests. Keep the allow-list specific to the normalized models URL. Add regression coverage in `modelDiscovery.test.ts` and `modelCatalog.test.ts` for the public-auth exception, URL normalization, and the resulting model options as applicable.

An anonymous model catalog does not mean that inference is anonymous. The provider may still require an API key for chat completions, as OpenCode Zen and OpenCode Go do. If the models response is not `{ data: [{ id }] }`, evaluate a provider-specific adapter or normalizer boundary instead of placing an ad hoc provider hack in shared discovery code.

## 5. Add focused tests and verify

Follow the repository test principle: add tests for an external contract, a real regression, or an important boundary, not for coverage alone. At minimum, protect the preset contract (required fields and provider defaults). When the provider has special endpoint behavior, also cover endpoint normalization and the public-auth exception. Reuse the existing `src/ai-providers/*` test files where the scenario belongs.

Run the same validation used by CI:

```bash
npm run lint
npm test
npm run build
```

## Checklist

- [ ] The provider's chat, models, authentication, model-ID, token, and JSON contracts are documented or verified.
- [ ] The preset is added with all `OpenAICompatiblePreset` fields and uses the shared adapter.
- [ ] The icon is registered through the icon guide, or the preset deliberately uses a supported favicon/initials configuration.
- [ ] Model discovery uses the normalized `<base>/models` contract; any public anonymous endpoint is explicitly allow-listed and tested.
- [ ] Focused preset, endpoint, catalog, or regression tests cover the changed contract.
- [ ] `npm run lint`, `npm test`, and `npm run build` pass.
