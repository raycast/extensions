# Mealie for Raycast

Manage your [Mealie](https://mealie.io) recipes, shopping lists and meal plan without leaving Raycast.

## Commands

| Command | What it does |
|---|---|
| **Search Recipes** | Search your recipes. Enter opens the recipe page in Mealie. `Cmd+M` plans it for a day, `Cmd+S` puts its ingredients on a shopping list. |
| **Add to Shopping List** | Add an item with autocompletion over your existing Mealie foods, so it keeps its aisle label. Free text works too. |
| **Shopping Lists** | Browse lists, check items off, edit quantity, unit, note and label, and create, rename or delete lists. |
| **Meal Plan** | Week view of your meal plan. Add, retype, move and remove entries. |
| **Import Recipe** | Import a recipe from a URL using Mealie's server-side scraper. |

## Setup

1. In Mealie, open your profile, then **Manage API Tokens**, and create a token.
2. Run any command of this extension in Raycast. It asks for two values:
   - **Mealie URL**, for example `https://mealie.example.org`
   - **API Token**, the token from step 1

Raycast stores the token in the macOS Keychain. This extension never writes it to disk.

### HTTPS

The extension refuses to send your token over plain HTTP unless the host is `localhost` or `127.0.0.1`. If your instance is only reachable over HTTP inside a trusted network, enable **Allow plain HTTP outside localhost** in the extension preferences. Your API token then travels unencrypted, so only do this on a network you trust.

## Details worth knowing

- **Shopping list order follows Mealie.** Items are grouped by label in the order you configured in Mealie's label settings, not alphabetically. Your store walk stays intact.
- **Autocompletion is client side.** All of your foods are fetched once and filtered locally with a substring match. Mealie's own search is token based and would not find `Basmatireis` when you type `reis`.
- **Adding a food carries its label.** The item lands in the right aisle instead of under "No Label".
- **New items have no quantity.** Mealie then shows the plain name. Set a quantity afterwards with `Cmd+E` in the list view.
- **Checking an item off preserves everything else.** Mealie's update endpoint defaults every field it does not receive, so the extension always sends the complete item. Quantity and note survive.
- **Imports are shown for verification.** Mealie's scraper can follow a redirect and return a different recipe. The result screen always shows the imported name so you can catch that.

## Requirements

- Mealie 2.0 or newer
- Node 22.22.2 or newer for development

## Development

```bash
npm install
npm run dev     # run the extension in Raycast
npm test        # unit tests for the API layer
npm run lint
```

`src/api` and `src/lib` never import `@raycast/api`, which keeps them testable under Vitest. Configuration is passed in rather than read from Raycast preferences inside those layers.
