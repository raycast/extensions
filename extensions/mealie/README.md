# Mealie

Search, open, and import recipes in your self-hosted Mealie instance from Raycast.

## Features

- Search recipes and open them in Mealie
- Copy recipe URLs
- Import recipes from a copied or pasted URL
- Open a random recipe when you need inspiration

## Setup

Before using the extension, configure the required preferences in Raycast:

1. **Mealie URL**: the base URL of your Mealie instance, for example `https://mealie.example.com`.
2. **API Token**: create a long-lived API token in Mealie from your user profile.
3. **Group Slug**: usually `home`; this is used to build recipe browser URLs.

## Commands

### Search Recipes

Searches your Mealie recipes and opens the selected recipe in the browser.

### Import Recipe from URL

Imports a recipe from a URL. If your clipboard already contains a URL, the command pre-fills it.

### Random Recipe

Picks a random recipe from your Mealie instance and opens it in the browser.

## Notes

This extension uses Mealie's API and requires a reachable Mealie instance plus a valid API token.
