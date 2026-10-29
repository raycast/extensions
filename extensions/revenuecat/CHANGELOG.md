# RevenueCat Changelog

## [Charts v3 Current Metrics] - 2026-10-22

- Use today’s Charts v3 values for MRR, active subscriptions, and active trials in the dashboard and menu bar.
- Refresh the menu bar cache so previous legacy values are not reused with Charts v3 enabled.
- Round dashboard and menu bar currency values to whole amounts.

## [Menu Bar Metrics] - 2026-10-12

- Add Menu Bar Metrics on macOS with a text-only value and a metric picker in command settings.
- Group menu metrics by revenue, subscriptions, and customers, with click-to-copy values and project switching.
- Refresh metrics every five minutes using the selected project and currency, with support for Demo mode.
- Isolate cached menu bar metrics by project so failed switches cannot show another project’s values.
- Keep the last loaded menu bar value and menu visible while refreshing or reopening the menu.
- Add an extension-wide Use Charts v3 setting, enabled by default, for dashboard and menu bar period metrics.
- Keep successful overview and chart metrics visible when individual Charts v3 requests fail.
- Coordinate OAuth refreshes across commands so background updates cannot erase a refreshed connection.

## [Initial Version] - 2026-10-08

- Add an OAuth-connected dashboard for revenue, subscriptions, trials, and customers.
- Search customers and inspect subscription details and event history.
- Browse daily revenue with date filters and infinite scrolling.
- Browse products and offerings, and switch projects across commands.
- Connect RevenueCat's official MCP server to Raycast AI.
- Include demo mode with sample data for previews.
