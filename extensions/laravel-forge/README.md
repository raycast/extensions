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

## AI Chat
Once installed, an "Ask Laravel Forge" item appears at the top of root search, and the extension can be
mentioned from AI Chat or Quick AI. It can list servers and sites, report what is deploying, read a
deployment log to explain a failure, read a site's Nginx config or logs, and check whether a site
responds. Deploying a site, restarting a service and rebooting a server ask for confirmation first, and
the card names every site the action takes down. A site's `.env` is deliberately out of reach here,
since anything a tool returns is sent to the model.

## Non-Forge API Features
- Check site connectivity
- Open command from raycast:// url
- Background deploy status refresh with menubar display
- System notification on deploy
- Open terminal session
- Copy meta information
