# Laravel Forge
A command center for sites managed by [Laravel Forge](https://forge.laravel.com/).

Get an API token here: https://forge.laravel.com/profile/api

This extension uses the Forge API v2, which replaces v1 on August 31, 2026.

Source repo: https://github.com/KevinBatdorf/laravel-forge-raycast

## API token scopes

Forge v2 tokens are scoped, so tick these when creating one:

| Scope | Used for |
| --- | --- |
| `organization:view` | Finding the organizations the token can see |
| `server:view` | Listing servers and their sites |
| `site:manage-deploys` | Triggering the deploy script, reading deployment history and output |
| `site:manage-environment` | Viewing a site's `.env` file |
| `site:manage-nginx` | Viewing a site's Nginx config |
| `server:manage-services` | Rebooting the server and its services |

The first two are enough to browse servers and sites; leave the rest off if you don't use those
commands. Nothing here needs a create, delete or billing scope. If the extension reports that Forge
rejected the token, it is missing a scope or predates the v2 API.
## Features from Forge API
- View site details
- View deployment status
- Multiple accounts
- Trigger deploy script
- Reboot services

## Non-Forge API Features
- Check site connectivity
- Open command from raycast:// url
- Background deploy status refresh with menubar display
- System notification on deploy
- Open terminal session
- Copy meta information
