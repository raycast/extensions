# RevenueCat Changelog

## [Menu Bar Metrics] - {PR_MERGE_DATE}

- Add Menu Bar Metrics on macOS with a text-only value and a metric picker in command settings.
- Group menu metrics by revenue, subscriptions, and customers, with click-to-copy values and project switching.
- Refresh metrics every five minutes using the selected project and currency, with support for Demo mode.
- Isolate cached menu bar metrics by project so failed switches cannot show another project’s values.
- Keep the last loaded menu bar value and menu visible while refreshing or reopening the menu.
- Add an extension-wide Use Charts v3 setting, enabled by default, for dashboard and menu bar period metrics.
- Coordinate OAuth refreshes across commands so background updates cannot erase a refreshed connection.

## [Initial Version] - 2026-10-08

- Add an OAuth-connected dashboard for revenue, subscriptions, trials, and customers.
- Search customers and inspect subscription details and event history.
- Browse daily revenue with date filters and infinite scrolling.
- Browse products and offerings, and switch projects across commands.
- Connect RevenueCat's official MCP server to Raycast AI.
- Include demo mode with sample data for previews.
