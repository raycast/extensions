# Contributing

Small fixes, compatibility reports, and provider adapters are welcome. Keep Session Limits fast, native to Raycast, and focused on measured subscription quotas.

## Run locally

Use macOS, Raycast 2.5.3+, and Node.js 22.14+:

```sh
npm ci
npm run dev
```

Before opening a pull request, run `npm run check`. Run `npm run bundle` when changing packaging and `npm run lint:store` when changing the Raycast manifest. Describe what changed and how you checked it; screenshots help for visible UI changes.

## Add or update a provider

For personal integrations, start with a [custom snapshot file](docs/providers.md#custom-snapshots). For a built-in adapter, open a provider request with a public protocol reference before implementing it.

- Return the shared [`ProviderSnapshot`](src/core/types.ts) shape and register the adapter in [`src/core/load.ts`](src/core/load.ts).
- Report only measured quotas and their actual observation time. Missing data is unknown; a passed reset does not prove zero usage.
- Keep authentication and provider-specific logic out of the UI. Isolate failures so one provider cannot hide another.
- Use documented provider interfaces and let official CLIs manage authentication. Do not read credential files, access Keychain credentials, or call private usage endpoints. Document compatibility limitations.
- Keep local reads and subprocess work bounded. Avoid new runtime dependencies unless necessary.
- Never add telemetry, log tokens, or include credentials in snapshots, fixtures, screenshots, or error reports. Connection prompts must follow an explicit user action.

Use synthetic data to check normal readings, unavailable data, stale readings, passed resets, and failed refreshes. Check the dashboard and menu bar when changing shared display behavior. The menu-bar total must exclude stale or failed readings.

## Report issues

Use the [issue templates](https://github.com/vkalipat/raycast-session-limits/issues/new/choose). Include versions, the affected provider, and steps to reproduce. Share sanitized errors instead of raw authentication files or session logs.

Contributions are distributed under the repository's [MIT license](LICENSE). Credit any source code you adapt and preserve its license requirements.
