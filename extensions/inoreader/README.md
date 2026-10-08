# Inoreader for Raycast

A Raycast extension that goes beyond the original Inoreader experience: it helps you read and triage faster, with a VIP system that immediately surfaces articles from priority sources, plus AI summaries generated from the full article page content.

## Important

This extension is only usable for users with an **Inoreader Pro** subscription, because API access is only available with the Pro plan.

## Available Commands

- `My Feed` (Articles command): browse feed articles with fast keyboard actions.
- `Saved Articles`: view saved articles.
- `Sources`: browse followed sources and manage VIP/non-VIP status.
- `Executive Summary`: generate an AI executive brief from your unread feed items.

## Current Features

- Save an article directly from the articles list (`Save`).
- Mark a single article as read (`Mark This Item as Read`).
- Mark the current stream as read (`Mark All as Read`).
- Generate an AI summary from the full article page (`AI Summary`).
- Generate an AI executive brief from unread feed items (`Executive Summary`).
- Manage VIP status directly from `Sources`:
  - `Add Source as VIP`
  - `Remove Source from VIP`
- Articles from VIP sources are grouped in a dedicated `VIP` section in the Articles command.

## Executive Summary

`Executive Summary` fetches unread articles from your main Inoreader feed and asks Raycast AI to produce a high-level executive brief.

Unlike `AI Summary` (which analyzes a single article page), this command analyzes the RSS feed content (titles, source, date, URL, and preview text) from multiple unread items to highlight the most important signals.

### What it does

- Loads unread items from your followed feeds.
- Builds a compact digest of the fetched unread articles.
- Filters and prioritizes important topics through a structured AI prompt.
- Returns a themed executive brief with source links.

### Language setting

- Uses the same extension preference as `AI Summary`: `AI Summary Language`
- Default: `English`

### Requirements and limits

- Uses Raycast AI API (`AI.ask`), so Raycast AI access (typically Raycast Pro) is required.
- Works on unread feed content available in RSS previews (not full-page article scraping).
- The summary is generated from a limited number of unread items fetched/analyzed in one run.

## AI Summary

`AI Summary` fetches the full web page URL for an article (not the RSS snippet), extracts the main content using Readability.js, and asks Raycast AI to generate a concise summary.

### Where to use it

- From `My Feed` actions:
  - `Quick Look` is the 3rd action (after opening actions).
  - `AI Summary` is available directly under `Quick Look`.
- From `Quick Look` actions:
  - `AI Summary` opens the dedicated summary view.

### Keyboard shortcuts

- In `My Feed`:
  - `Quick Look`: `Right Arrow`
  - `AI Summary`: `Cmd + Right Arrow`
- In `Quick Look`:
  - `AI Summary`: `Right Arrow`
- In `AI Summary`:
  - `Open Article in Background`: `Enter`
  - `Open Article`: `Cmd + Enter`
  - `Regenerate Summary`: `Option + R`

### Language setting

- Extension preference: `AI Summary Language`
- Default: `English`
- You can set any language name (for example: `French`, `Spanish`, `German`), and summaries will be requested in that language.

### Requirements and limits

- Uses Raycast AI API (`AI.ask`), so Raycast AI access (typically Raycast Pro) is required.
- Some sites may block scraping or return unreadable HTML, in which case summary generation can fail.

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
