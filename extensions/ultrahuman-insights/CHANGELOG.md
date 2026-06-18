# Ultrahuman Changelog

## [Add Windows support and streamline codebase] - {PR_MERGE_DATE}

- Add Windows as a supported platform
- Extract shared hooks and components (`useDailyRange`, `MetricActions`) to reduce duplication across commands
- Update Raycast API and dev dependencies (ESLint, TypeScript, Prettier)

## [Initial Version] - 2026-06-18

- Menu bar with color-coded sleep score
- Five view commands: Today's Health, Sleep Detail, HRV & Heart Rate, Recovery & Movement, 7-Day Trends
- Three Raycast AI tools: get-today, get-metric, get-trend
- Smart insights with per-metric thresholds and 7-day deltas
- Split-pane List+Detail views with metadata sidebars on Sleep and HRV
- Inline SVG charts for trends and sleep stages
- 5-minute TTL cache with 24-hour stale fallback on network errors
- Native Raycast UI throughout (SF Symbols, Detail.Metadata, Color tokens)
