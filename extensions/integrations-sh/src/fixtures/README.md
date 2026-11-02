# Surface action fixtures

Captured from the public stored-surface API on 2026-10-12:

- https://integrations.sh/api/github.com/surface
- https://integrations.sh/api/stripe.com/surface
- https://integrations.sh/api/integrations.sh/surface

These are projections of the MCP and CLI surfaces and credential metadata. Discovery evidence and auth mechanics are omitted, and setup prose is replaced with an empty string. URLs, package identifiers, credential IDs, and bindings are preserved.

The upstream [v3 schema](https://github.com/UsefulSoftwareCo/integrations/blob/main/src/lib/discovery-schema.ts) defines MCP `url`, CLI `packages` (`registryType`, `identifier`, optional `runtimeHint`), and `credentials[id].generateUrl`. `command` is the executable name, not an installation command. The action derives only npm global-install and Homebrew install commands from validated package identifiers. See [npm install](https://docs.npmjs.com/cli/v11/commands/npm-install/) and [GitHub CLI installation](https://cli.github.com/).

Tests do not make network requests, install any integration, or open credential pages.
