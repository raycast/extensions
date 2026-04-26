# Tryambakam Noesis Quick Start

## 1. Connect The Extension

Open `API Key` in Raycast and enter:

- `Selemene Engine API Key` - your `nk_...` key
- `Selemene Engine Base URL` - usually `https://selemene.tryambakam.space`

The command validates the account before saving configuration and warming the local cache.

## 2. Keep The Route Explicit

In Raycast preferences, leave `Execution Route` on `Selemene Direct` unless you intentionally want the Witness gateway path.

Available routing options:

- `Selemene Direct` - default path for engine and workflow execution
- `Witness Gateway` - explicit alternative path when you want Witness-enriched execution

## 3. Open The Main Surfaces

Use the command set this way:

- `Dashboard` - command center and first cache warm
- `Engines` - single-engine runs
- `Workflows` - multi-engine synthesis
- `Readings` - local history and interpreted result pages
- `Profile` - birth data, timezone, default precision, default workflow
- `Daily Witness` - somatic witness reading flow
- `Pulse` - menu bar insight plus mirrored pulse board detail

## 4. Understand What Stays Local

The extension keeps a local SQLite cache at Raycast `environment.supportPath` for accessibility and continuity.

By default it stores:

- service health and rate-limit metadata
- engine catalog
- workflow catalog
- profile and usage snapshots
- recent readings with minimized payloads
- pulse insight snapshots

Secrets are not stored in SQLite. The preferred key path is the Raycast secure password preference.

## 5. Useful Preferences

The most important operational preferences are:

- `apiKey`
- `baseUrl`
- `witnessUrl`
- `executionRoute`
- `readingHistoryLimit`
- `cacheRawPayloads`
- `pulseMode`

## 6. Local Verification

```bash
PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit
PATH=/opt/homebrew/bin:$PATH npm run build
```

## 7. Next References

- [README](./README.md)
- [Store Submission Notes](./docs/store-submission.md)
- [Changelog](./CHANGELOG.md)
