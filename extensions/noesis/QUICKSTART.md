# Selemene Noesis - Quick Start

## 1. Run Onboarding

Open the `Noesis Onboarding` command in Raycast and enter:
- `Base URL`: usually `https://selemene.tryambakam.space`
- `API Key`: your `nk_...` key

The onboarding flow validates the key before saving it and warms the local cache.

## 2. Open The Dashboard

After onboarding, open `Noesis Dashboard`.

It reads from local SQLite first, then refreshes stale data from:
- `GET /health/live`
- `GET /api/v1/status`
- `GET /api/v1/users/me`
- `GET /api/v1/users/me/usage`
- `GET /api/v1/readings`
- `GET /api/v1/readings/stats`
- workflow and engine `.../info` endpoints

## 3. What Stays Local

The extension preserves locally cached:
- workflows
- engines
- usage summaries
- recent readings
- reading stats
- last successful service snapshot

If the API is temporarily unavailable, the dashboard and menu bar continue to show cached data.

## 4. Local Verification

```bash
PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit
rm -rf /tmp/noesis-testbuild
PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild
node --test /tmp/noesis-testbuild/lib/api.test.js /tmp/noesis-testbuild/lib/cache.test.js
```

## 5. Development Overrides

If needed, the extension still falls back to:
- `baseUrl` Raycast preference
- `NOESIS_API_BASE_URL` / `SELEMENE_BASE_URL`
- `NOESIS_API_KEY` / `SELEMENE_API_KEY`
