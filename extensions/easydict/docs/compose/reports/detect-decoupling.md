---
feature: detect-decoupling
status: delivered
specs: []
plans:
  - docs/compose/plans/detect-decoupling.md
branch: main
commits: (pending)
---

# Decouple Language Detection — Final Report

## What Was Built

Language detection is now a first-class provider domain, fully decoupled from translation providers. A new `src/providers/detect/` namespace contains a `BaseDetectProvider` abstract class, a `detectServices` registry, and five concrete providers (Bing, Baidu, Tencent, Volcano, Franc). The core detect engine (`src/core/detect/index.ts`) no longer imports any translation provider files — it iterates the generic detect registry, separating network API detectors from local offline detectors via the `isLocal` flag.

Shared authentication utilities (`hasAppKey` functions) were extracted to `src/providers/shared/` for Baidu, Tencent, and Volcano. The old standalone detect functions (`bingDetect`, `baiduWebDetect`, `tencentDetect`, `volcanoDetect`) were removed from the translation providers, leaving them focused solely on translation.

## Architecture

```
core/detect/index.ts          — generic engine, iterates detectServices registry
    │
    ├── providers/detect/
    │   ├── base.ts           — BaseDetectProvider abstract class
    │   ├── registry.ts       — detectServices: DetectServiceConfig[]
    │   ├── index.ts          — barrel export
    │   ├── bing.ts           — BingDetectProvider (always enabled)
    │   ├── baidu.ts          — BaiduDetectProvider (pref: enableBaiduLanguageDetect)
    │   ├── tencent.ts        — TencentDetectProvider (pref: enableTencentTranslate)
    │   ├── volcano.ts        — VolcanoDetectProvider (pref: enableVolcanoTranslate)
    │   └── franc.ts          — FrancDetectProvider (isLocal=true, offline fallback)
    │
    └── providers/shared/
        ├── baidu.ts          — hasBaiduAppKey()
        ├── tencent.ts        — hasTencentAppKey()
        └── volcano.ts        — hasVolcanoAppKey()
```

### Design Decisions

**Template method pattern with `isLocal` flag.** `BaseDetectProvider` mirrors `BaseTranslateProvider` — public `detect()` handles error normalization, subclass implements `doDetect()`. The `isLocal` boolean separates offline detectors (Franc) from network APIs, letting the engine prioritize network results and fall back to local.

**`francLanguageDetect` kept as standalone function.** Franc's detection logic requires a `confirmedConfidence` parameter and returns complex multi-result data (`detectedLanguageArray`). Forcing this through the generic `doDetect(text)` interface would require awkward parameter threading. Instead, `FrancDetectProvider.doDetect()` wraps the standalone function, and `core/detect/index.ts` calls `francLanguageDetect` directly for the local fallback path.

**Baidu web detect has no auth.** The plan suggested extracting shared auth for Baidu, but `baiduWebDetect` uses an unofficial web API with no authentication. The shared `baidu.ts` only contains `hasBaiduAppKey()` for the translate provider's use.

**Old detect functions removed from translation providers.** `bingDetect`, `baiduWebDetect`, `tencentDetect`, and `volcanoDetect` were deleted. Type interfaces (`BaiduWebLanguageDetect`, `BingTranslateResult`, `VolcanoDetectResult`) remain in translation providers since `QueryResponse` imports them.

## Usage

No user-facing changes. Detection behavior is identical — the same providers fire in parallel, consensus logic is unchanged, and the same preferences control which providers are enabled.

## Verification

- `npx tsc —noEmit` — passes clean
- `npm run fix-lint` — passes clean (ESLint + Prettier)
- All 4 tasks completed and verified

## Journey Log

- [lesson] Baidu web detect uses an unofficial API with no auth — shared auth extraction was unnecessary for Baidu detect specifically.
- [lesson] Franc's `confirmedConfidence` parameter doesn't fit the generic `doDetect(text)` interface cleanly. Wrapping the standalone function in the provider while keeping direct access in the engine was the pragmatic solution.
- [pivot] Volcano's `volcanoSign.js` is JavaScript — converting it to TypeScript would be a separate refactor. Kept as-is with `allowJs: true` in tsconfig.

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/plans/detect-decoupling.md` | Implementation plan | 4 tasks, all completed |
