# TrustMRR Changelog

## [Add New API Metrics + Metric-Based Sorting] - {PR_MERGE_DATE}

- Add support for new API fields in extension data models: `growthMRR30d`, `visitorsLast30Days`, `googleSearchImpressionsLast30Days`, `revenuePerVisitor`, and `rank`
- Surface new metrics in startup details metadata: revenue rank, MRR growth (30d), revenue per visitor, visitors (30d), and search impressions (30d)
- Enhance startup list items with metric accessories for rank, MRR momentum, and revenue-per-visitor efficiency
- Add new list sorting presets: `Top Ranked`, `MRR Momentum`, and `High Efficiency`

## [Add Startup Category Labels] - 2026-03-06

- Add startup category labels to the list startups command
- Use Raycast API best practices

## [Initial Version] - 2026-03-06

Added commands:

- `List Startups`: List all startups with pagination and filtering. Sort by revenue, price, multiple, growth, recently listed, oldest listings, and best deal. Filter by category..
- `Get Startup`: Get full startup details by slug.
