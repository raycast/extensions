# Cook — Raycast Extension

A Raycast extension for [CookCLI](https://cooklang.org/cli/) — browse, search, scale, and generate shopping lists from your Cooklang recipe collection, all from the Raycast command bar.

## Features

- **Browse Recipes** — Navigate your recipe directory in a tree view
- **Search Recipes** — Full-text search across recipe names, ingredients, and steps
- **Scale & View** — Pick a recipe, set servings, see ingredients and steps
- **Shopping List** — Multi-select recipes and generate a combined list
- **Deep-link to Android** — Open a recipe in the Cook Android app
- **Quick Actions** — Open in browser (`cook server`), open `.cook` in VS Code

## Setup

1. Make sure you have CookCLI installed and built: `C:\Users\spiri\CookCLI`
2. Install dependencies: `npm install`
3. Run dev: `npm run dev`

## Preferences

Configure in Raycast:

- **Recipe Directory**: Path to your Cooklang recipes (default: ideaverse-vault `x/Cook`)
- **CookCLI Binary Path**: Path to `cook.exe`
- **Server Port**: Port for the web server
