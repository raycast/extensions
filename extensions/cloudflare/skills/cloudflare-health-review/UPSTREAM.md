# Upstream sources

This skill adapts selected guidance from [Cloudflare's public skills](https://github.com/cloudflare/skills), revision `6dc7604903127485e7e4cb26314651ebd4a4df19`, reviewed on September 24, 2026. The upstream material is licensed under Apache 2.0; its license is retained in [LICENSE](LICENSE).

| Source | Guidance adapted |
| --- | --- |
| [Cloudflare skill](https://github.com/cloudflare/skills/blob/6dc7604903127485e7e4cb26314651ebd4a4df19/skills/cloudflare/SKILL.md) | Choose the relevant product and preserve the existing architecture during investigation. |
| [Pages troubleshooting](https://github.com/cloudflare/skills/blob/6dc7604903127485e7e4cb26314651ebd4a4df19/skills/cloudflare/references/pages/gotchas.md) | Identify whether the failure is in the build, asset serving, or Function execution, and distinguish preview from production. |
| [Wrangler skill](https://github.com/cloudflare/skills/blob/6dc7604903127485e7e4cb26314651ebd4a4df19/skills/wrangler/SKILL.md) | Identify account, Worker, environment, and resource before acting; separate deployment validation from runtime behavior. |
| [Observability reference](https://github.com/cloudflare/skills/blob/6dc7604903127485e7e4cb26314651ebd4a4df19/skills/cloudflare/references/observability/README.md) | Distinguish deployment evidence, aggregate metrics, historical logs, and live runtime logs. |

## Changes for Raycast

The bundled skill is a read-only diagnostic workflow. It replaces upstream CLI, configuration editing, documentation retrieval, and MCP workflows with the existing Raycast tools. It adds exact tool inputs, identifier discovery, DNS heuristic caveats, per-environment Pages checks, explicit deployed Worker version selection, bounded history and log handling, and an evidence-based report format.

The extension has no AI tools for live DNS lookups, HTTP probes, registrar inspection, Pages custom-domain discovery, Worker runtime logs, redeployment, or rollback. Those parts of the upstream workflows are not bundled. No new tools, permissions, dependencies, or API versions are introduced.

## Existing AI tools and inputs

All 21 files in `src/tools/` were reviewed. Twenty are registered tools; `helpers.ts` contains internal identifier-resolution functions. Below, `?` means optional; identifiers and names are strings, counts are numbers, and proxy flags are booleans.

| Tool | Inputs |
| --- | --- |
| `list-zones` | None |
| `find-dns-records` | `query` of at least two characters; `zoneId?` |
| `check-dns-health` | `zoneId` |
| `get-dnssec-status` | `zoneId` |
| `get-zone-analytics` | `zoneId`; `period?` is `24h`, `7d`, or `30d`, default `24h` |
| `get-zone-settings` | `zoneId` |
| `list-ssl-certificates` | `zoneId` |
| `list-pages-projects` | `accountId?` |
| `list-deployments` | `accountId?`; `product?` is `pages`, `workers`, or `all`, default `all`; `limit?` is 1–20 per project or Worker, default 5 |
| `get-pages-deployment-logs` | `accountId`, `projectName`, `deploymentId`; `limit?` is the last 1–500 lines, default 100 |
| `list-workers` | `accountId?` |
| `list-worker-routes` | `zoneId` |
| `inspect-worker` | `accountId`, `workerName`; `versionId?`, default newest version |
| `list-account-members` | `accountId?` |
| `list-audit-logs` | `accountId?`; `limit?` is 1–100 total entries, default 20 |
| `create-dns-record` | `zoneId`, `type`, `name`, `content`; `ttl?`, `proxied?`, `priority?`, `comment?` |
| `update-dns-record` | `zoneId`, `recordId`, `recordName`; at least one of `name?`, `content?`, `ttl?`, `proxied?`, `priority?`, `comment?`, `tags?: string[]` |
| `delete-dns-record` | `zoneId`, `recordId`, `recordName` |
| `set-dnssec-status` | `zoneId`, `zoneName`; `status` is `active` or `disabled` |
| `purge-zone-cache` | `zoneId`; one of `urls?`, `hosts?`, `tags?`, or `prefixes?`, each a string array; omitting all purges the entire zone |

Creation accepts `A`, `AAAA`, `CAA`, `CNAME`, `MX`, `NS`, `SRV`, or `TXT`. TTL is 1 for automatic or an integer from 30 to 86400; creation defaults to 1. Proxy changes apply only to A, AAAA, and CNAME; priority applies to MX and is required when creating an MX record. Comments are limited to 100 characters. Update replaces the complete tags array; empty comments or tags remove the existing values. The five mutation tools have built-in confirmations and are excluded from this diagnostic workflow.

## Public API validation

See [validation results](VALIDATION.md) for checks after the API 2.5.0 update.
