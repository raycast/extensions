# Inoreader (Raycast)

A Raycast extension that goes beyond the original Inoreader experience: it helps you read and triage faster, with a VIP system that immediately surfaces articles from priority sources.

## Available Commands

- `My Feed` (Articles command): browse feed articles with fast keyboard actions.
- `Saved Articles`: view saved articles.
- `Sources`: browse followed sources and manage VIP/non-VIP status.

## Current Features

- Save an article directly from the articles list (`Save`).
- Mark a single article as read (`Mark This Item as Read`).
- Mark the current stream as read (`Mark All as Read`).
- Manage VIP status directly from `Sources`:
  - `Add Source as VIP`
  - `Remove Source from VIP`
- Articles from VIP sources are grouped in a dedicated `VIP` section in the Articles command.

## Article Opening UX Choice

By default, `Enter` opens an article in the background and keeps the Raycast window open.

This lets users:

- open multiple interesting articles quickly without leaving the list,
- then mark the feed as read,
- then read the opened articles afterward.

`Cmd + Enter` is still available to open the article in the foreground browser tab.

## OAuth Setup

1. Create an OAuth app in Inoreader: `https://www.inoreader.com/preferences/other`
2. Configure:
   - Redirect URI: `https://raycast.com/redirect/extension`
   - Scope: `read write`
3. Fill extension preferences in Raycast:
   - `Client ID`
   - `Client Secret`

## Notes

- VIP status is local to this extension (stored in Raycast), not a native Inoreader field.
- OAuth tokens are handled by Raycast secure storage.
