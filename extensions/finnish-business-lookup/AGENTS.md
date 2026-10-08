# AGENTS.md

Contributor and coding-agent rules for this repo.

## Scope

- Keep this extension focused on PRH company lookup.
- Work is allowed when it directly improves lookup quality/UX and stays inside PRH/YTJ data unless explicitly approved otherwise.

## Hard Requirements

- Use Bun for local workflows (`bun install`, `bun run ...`).
- Use built-in `fetch`; do not add `node-fetch`.
- Keep API access in `src/api/`, mapping/selection logic in `src/lib/`.
- Preserve query-safety behavior in `src/hooks/use-prh-search.ts`:
  - no empty `/companies` query
  - support only Business ID and name modes
- Favorites storage key must remain `prh-favorites-v1` unless a migration is implemented.

## Guardrails

- Favor high-signal list rows and hierarchical detail views (summary first, deep data below).
- Treat company name history as first-class data:
  - current legal name
  - previous legal names (when available)
  - alternate/trade names (when available)
- Keep data provenance clear: PRH fields first, inferred/computed values clearly labeled.
- Do not add third-party enrichment sources (financial/contact/map providers) without explicit approval.
- Keep behavior predictable in Raycast:
  - list remains fast and scannable
  - full detail stays available via `View Details`
  - actions stay practical (copy IDs/addresses, open source pages)

## Validation Before Finish

- `bun run lint`
- `bun run build`

## Full Documentation

- Developer guide: `docs/DEVELOPMENT.md`
- Usage guide: `docs/USAGE.md`
