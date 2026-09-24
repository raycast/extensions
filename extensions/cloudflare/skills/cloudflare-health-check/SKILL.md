---
name: cloudflare-health-check
description: Use when a user wants to investigate Cloudflare DNS configuration, recent deployment failures, or health signals for Pages and Workers without changing infrastructure.
---

# DNS and deployment health

## When to use

Use for a read-only health report or investigation of a named zone or deployment.
These tools inspect configuration, analytics, and deployment records; they do not
perform an external HTTP or DNS probe. Use only the tools named below.

## Workflow

1. Call `list-zones` to resolve the requested hostname, zone, and account.
   Retain the returned `zoneId` and `accountId`; clarify an ambiguous target.
   Establish the incident window and whether DNS, Pages, Workers, or all are in scope.
2. For DNS, call `find-dns-records` with a specific `query` and `zoneId`, then
   `check-dns-health` with `zoneId`. Read each finding and its affected records.
   Call `get-dnssec-status` when signing is relevant. The health score reflects
   configuration checks and does not establish public DNS propagation or reachability.
3. Call `get-zone-analytics` with `zoneId` and a supported `period`
   of `24h`, `7d`, or `30d` when traffic or error trends help investigate.
   Read `get-zone-settings` or `list-ssl-certificates` for relevant TLS concerns.
   Report the actual window and avoid treating zone-wide metrics as one endpoint's health.
4. For Pages, call `list-pages-projects` with `accountId`, then `list-deployments`
   with that account, `product: "pages"`, and a suitable `limit` up to 20.
   Distinguish production from previews. For a failed deployment, call
   `get-pages-deployment-logs` with `accountId`, `projectName`, and `deploymentId`.
   Check its truncation flag before concluding that no further errors exist.
5. For Workers, call `list-workers` and `list-deployments` with `product: "workers"`.
   Use the active deployment's version IDs and traffic percentages. Call
   `inspect-worker` with `accountId`, `workerName`, and the relevant `versionId`;
   the newest version is not necessarily the one receiving traffic.
   Call `list-worker-routes` with `zoneId` when routing may explain the symptom.
6. Correlate timestamps, commit information, DNS records, and configuration findings.
   Separate observed failures from hypotheses. Recommend the smallest next check
   or proposed correction, including any external probe the tools cannot perform.
7. State which records, deployments, and periods were inspected and any permission,
   pagination, or log limits that prevent a complete assessment.

## Output

- Target zone/account, products, observation window, and overall evidence-based status.
- Findings ordered by impact, with record/deployment IDs and returned links.
- Supporting configuration, metrics, or log excerpts and proposed next checks.
- Unknowns, untested endpoint reachability, and any truncated or unavailable data.

## Do not

- Do not change DNS, DNSSEC, deployments, routes, or caches during a health check.
- Do not equate a successful deployment or configuration score with live uptime.
- Do not claim a root cause from timing alone or expose unnecessary log secrets.
