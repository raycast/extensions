# Laravel Forge v2
A command center for sites managed by [Laravel Forge](https://forge.laravel.com/), built on the Forge **API v2**.

## Setup
Get a **v2 API token** here: https://forge.laravel.com/user-profile/api (v1 tokens are no longer supported).

### Required API token scopes
Forge API v2 tokens use granular abilities. Select the scopes below when creating your token to enable every feature:

| Scope | Enables |
|---|---|
| `organization:view` | List organizations (required — everything is organization-scoped) |
| `server:view` | List servers & sites, view `.env`, deployment history |
| `site:manage-nginx` | View nginx config |
| `site:manage-deploys` | Trigger deploys and read deployment logs |
| `server:manage-services` | Reboot the server and restart MySQL / Nginx / PHP / Postgres |

For **read-only** use, only the first three are needed (`organization:view`, `server:view`, `site:manage-nginx`). Add `site:manage-deploys` for deployments and `server:manage-services` for reboots.

> Note: a few scopes are broader than they look — viewing `.env` and deployment history both fall under `server:view`, and reading a deployment log requires `site:manage-deploys`.

Source repo: https://github.com/KevinBatdorf/laravel-forge-raycast

## Organizations
Forge API v2 scopes everything under an organization. The **Manage Servers** command lets you work across them:

- **Filter by organization** using the dropdown in the search bar, or press **`⌘⇧O`** to open the **Switch Organization** submenu — the current org is marked with a checkmark, and you can arrow to or type to filter for the one you want. Only organizations that have servers are listed.
- **Set a default organization** so it's pre-selected on launch: either enter your organization slug in the extension preferences, or highlight a server and run the **Set Selected Org as Default** action. Precedence is saved default → preference → all organizations.

## Features from Forge API
- View site details
- View deployment status
- Multiple accounts
- Trigger deploy script
- Reboot services

## Non-Forge API Features
- Check site connectivity
- Open command from raycast:// url
- Open terminal session
- Copy meta information
