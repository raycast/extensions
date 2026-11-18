# RevenueCat

Explore your RevenueCat data from Raycast. Check revenue and subscription metrics, find customers, inspect their subscriptions and event history, and browse your product catalog.

## Getting started

Open **Show Dashboard** and sign in to RevenueCat via OAuth. Authorize access to the projects you want to use, then choose a project with **⌘P**. Your selection is remembered across commands.

A RevenueCat account with access to at least one project is required for live data. No API key is needed. To preview the extension without an account, enable **Demo mode** in extension settings and reopen a command.

## Menu bar

On macOS, run **Menu Bar Metrics** to keep a metric visible in the menu bar. MRR is shown by default. In the command’s settings, choose MRR, revenue, active subscriptions, active trials, new customers, or active customers.

Open the menu to browse metrics grouped by revenue, subscriptions, and customers. Click a value to copy it, or switch projects from the menu. Metrics use your selected currency, refresh every five minutes, and support Demo mode. Sign in through **Show Dashboard** first to use live data.

## Raycast AI

**Ask RevenueCat** connects to [RevenueCat's official MCP server](https://www.revenuecat.com/docs/tools/mcp). Ask questions about your projects, customers, and subscription business, or request changes through the available tools.

The AI connection has its own OAuth sign-in, so you may need to authorize it separately. It requests read and write access. Available tools depend on the projects and permissions you grant. The regular extension views only read data.

## Settings

- **Currency:** USD, EUR, GBP, or SEK for monetary metrics. Product prices are indicative US prices, and customer lifetime revenue is explicitly shown in USD.
- **Use Charts v3:** enabled by default. Uses Charts v3 for all dashboard and menu bar metrics, including current MRR, subscriptions, and trials. Turn it off to use the legacy overview. RevenueCat cannot return a distinct active-customer total across calendar years, so that metric is unavailable while the 28-day range crosses New Year.
- **Demo mode:** use the fictional Demo project with sample metrics, customers, subscriptions, events, and products. This does not contact RevenueCat or require sign-in. Turn it off to return to your saved account and project.
