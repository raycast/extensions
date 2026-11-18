# OpenSearch DevTools

Query and manage your OpenSearch clusters from Raycast — keyboard-first.

## Features

- **Console** — paste OpenSearch Dashboards Dev Tools syntax (`GET posts/_search` + a JSON body) and run it directly.
- **API Explorer** — send any request (`GET`, `POST`, `PUT`, `DELETE`) with a JSON body and inspect the response.
- **Command Palette** — one-keystroke access to common commands (Cluster Health, Cat Indices, Nodes, Aliases, Templates, Tasks…).
- **Search** — pick an index and run a search query.
- **Query History** — re-run recent queries and keep favorites (last 100).
- **Manage Connections** — save multiple clusters (Dev / Stage / Production) and pick a default.

## Setup

Open **Manage Connections** and add a cluster. Two authentication modes are supported:

- **Basic Auth** — username / password (self-hosted clusters, OpenSearch Security plugin).
- **AWS SigV4** — access key / secret (+ optional session token), region, and service (`es` for managed OpenSearch, `aoss` for Serverless).

Enable **Ignore Certificate Errors** for clusters using self-signed certificates.

If you only use a single cluster, you can instead fill in the extension preferences (URL / username / password) as a fallback.

### Security

Connection details — including passwords and AWS secrets — are stored in Raycast's local encrypted database (`LocalStorage`). They never leave your machine except to talk to the clusters you configure.

## Copy formats

Every response can be copied as raw JSON, pretty JSON, a runnable `curl` command, or in OpenSearch Dashboards Dev Tools console format.
