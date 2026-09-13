# OpenCode Zen model metadata: pricing + modalities source

**Question:** Where do OpenCode Zen model prices and modalities come from?

**Answer:** The authoritative per-model **pricing and modalities** for the 70
live OpenCode Zen model ids come from the **`opencode` provider on models.dev**
(`https://models.dev/api.json`, key `opencode` — the provider is literally named
"OpenCode Zen", `api: https://opencode.ai/zen/v1`). It covers **all 70/70** ids
with `cost` and `modalities`. The Zen HTTP API itself exposes **no** pricing or
modality data, and opencode's internal billing metadata (`ZEN_MODELS` secrets)
is not publicly readable.

---

## 1. The Zen API itself — no metadata

- `https://opencode.ai/zen/v1/models` returns exactly the OpenAI-style catalog
  shape: `{"object":"list","data":[{"id","object","created","owned_by"}]}` —
  **only ids, no `cost`, no `modalities`**. Confirmed 2026-09-10, 70 ids.
- Identical with and without auth. The `opencode` API key in
  `~/.local/share/opencode/auth.json` (key name `opencode`, not `opencode-go` or
  a `zen` key) authenticates the Zen surface but does not add fields.
- No sibling metadata endpoints exist. Probed, all 404:
  `/zen/v1/usage`, `/zen/v1/pricing`, `/zen/v1/prices`, `/zen/v1/modalities`,
  `/zen/v1/billing`, `/zen/v1/price`, `/zen/v1/account`,
  `/zen/v1/models/{id}`, `/zen/v1/models/{id}/pricing`, `/zen/v1/openapi.json`,
  `/zen/v1/docs`.
- `/zen/go/v1/usage` (the Go-product usage endpoint) exists and works, but the
  Zen surface has no `/usage` equivalent.
- Conclusion: **no public Zen API endpoint carries per-model pricing or
  modalities.**

## 2. models.dev — the best public source (full coverage)

`https://models.dev/api.json` contains a provider with:

```json
"opencode": {
  "id": "opencode",
  "env": ["OPENCODE_API_KEY"],
  "npm": "@ai-sdk/openai-compatible",
  "api": "https://opencode.ai/zen/v1",
  "name": "OpenCode Zen",
  "doc": "https://opencode.ai/docs/zen",
  "models": { ... }
}
```

This is not `opencode-go` (that's the separate Go-product provider, api
`https://opencode.ai/zen/go/v1`) and there is no `opencode-zen` / `zen*`
provider. The provider id is plain **`opencode`**.

**Coverage:** of the 70 live ids returned by `https://opencode.ai/zen/v1/models`
as of 2026-09-10, all **70 (100%)** have both `cost` and `modalities` entries in
`opencode` on models.dev. The provider actually holds 102 model entries; the
extra 32 are older/deprecated/free-variant ids no longer in the live Zen catalog
(e.g. `gemini-3-pro`, `kimi-k2`, `minimax-m2.1`, `glm-4.7`).

Note: models.dev is byte-identical to opencode's own mirror
`https://models.opencode.ai/api.json` (same file size, `cmp` clean) — the stats
app in the opencode repo reads `models.opencode.ai/api.json`.

### Data shape (sample)

Each model entry is a models.dev model record with `cost` and `modalities`:

- `cost`: `{ input, output, cache_read, cache_write? }` plus optional
  `tiers`/`context_over_200k` for long-context tiering (e.g. GPT-5.6*).
- `modalities`: `{ input: [...], output: [...] }`.

| model id | cost input | cost output | cost cache_read | cost cache_write | modalities input | modalities output |
|---|---|---|---|---|---|---|
| claude-opus-5 | 5.00 | 25.00 | 0.50 | 6.25 | text, image, pdf | text |
| gpt-5.6-luna | 0.20 | 1.20 | 0.02 | 0.25 | text, image, pdf | text |
| deepseek-v4-flash | 0.14 | 0.28 | 0.028 | — | text | text |
| deepseek-v4-pro | 1.74 | 3.84 | 0.145 | — | text | text |
| minimax-m3 | 0.30 | 1.20 | 0.06 | — | text, image, video | text |
| kimi-k2.5 | 0.60 | 3.00 | 0.08 | — | text, image, video | text |
| qwen3.6-plus | 0.50 | 3.00 | 0.05 | 0.625 | text, image, video | text |
| big-pickle | 0 | 0 | 0 | 0 | text | text |

Free-tier ids (`*-free`, `muse-spark-1.3-contributor-free`, etc.) are all
present with cost 0.

### Caveats on models.dev `opencode`

- **Hand-maintained, not auto-synced.** There is no sync provider module for
  `opencode` in the models.dev repo (`packages/core/src/sync/providers/` has no
  opencode/zen module). Updates arrive as manual PRs/commits ("update zen
  models", "feat(opencode): add Zen models") in `github.com/anomalyco/models.dev`
  (`providers/opencode/{provider.toml,models/*.toml}`). Expect lag when opencode
  changes the Zen catalog.
- **Small pricing discrepancies vs the official docs page** for a few ids:
  `deepseek-v4-pro` output (models.dev 3.84 vs docs $3.48), `gpt-5.6-terra`
  base tier (models.dev 2.50/15.00/0.25/3.125 vs docs $2.00/$12.00/$0.20/$2.50),
  `kimi-k2.5` cache_read (0.08 vs docs $0.10). Most ids match exactly.
- The models.dev `opencode` provider covers the **live** 70-id catalog; the
  official docs endpoints table additionally lists `qwen3.7-max`/`qwen3.7-plus`,
  which are **not yet** in the live API or models.dev as of 2026-09-10.

## 3. opencode's own source — authoritative but private

- The opencode repo (`github.com/anomalyco/opencode`) serves `/zen/v1/models`
  from `ZenData.list("full").models` in
  `packages/console/app/src/routes/zen/v1/models.ts`. `ZenData`
  (`packages/console/core/src/model.ts`) defines the per-model schema:
  `cost` (`input`, `output`, `cacheRead`, `cacheWrite5m`, `cacheWrite1h`,
  optional `cost200K` tier, `costPeak`, `costMultiplier`) — but **no modalities
  field** in the billing schema.
- The actual values are injected at deploy time from **SST secrets**
  `ZEN_MODELS1..ZEN_MODELS30` (concatenated JSON), which are **not committed to
  the repo** (only names/scripts reference them: `infra/console.ts`,
  `packages/console/core/script/{pull,update,promote}-models.ts`). So opencode's
  own billing truth is private.
- The public docs page `https://opencode.ai/docs/zen/` (source
  `packages/web/src/content/docs/zen.mdx`) has a static **pricing table
  (per-1M tokens: input/output/cached read/cached write)** for the Zen models —
  good for human-readable prices, but it has **no modalities** and is not a
  machine-readable catalog. Last updated Sep 9, 2026.
- Installed packages (`~/.config/opencode/node_modules/@opencode-ai/{plugin,sdk}`)
  contain no Zen model metadata.

---

## Bottom line for the charting session

- **Source:** models.dev `api.json` → provider `opencode` (name "OpenCode Zen",
  api `https://opencode.ai/zen/v1`). No auth needed to fetch.
- **Shape:** per-model `cost` (`input`/`output`/`cache_read`/`cache_write`, plus
  `tiers`/`context_over_200k` for long-context models) and
  `modalities` (`input`/`output` arrays).
- **Coverage:** 70/70 of the live Zen ids.
- **Caveats:** hand-maintained (lag risk); a handful of ids disagree slightly
  with the official docs pricing table; `qwen3.7-max`/`qwen3.7-plus` exist in
  docs but not yet in the live catalog; the "true" billing data lives in private
  `ZEN_MODELS` SST secrets. Recommended implementation: reuse the existing
  `fetchPricing` path but read `json["opencode"]` instead of
  `json["opencode-go"]`.